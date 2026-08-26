// Firebase query optimization and error handling utilities

import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  onSnapshot, 
  DocumentData,
  QueryConstraint,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';

// Generic error handler for Firebase operations
export const handleFirebaseError = (error: any, operation: string, showToast: boolean = false) => {
  console.error(`Firebase ${operation} error:`, error);
  
  let message: string;
  
  if (error.code === 'unavailable') {
    message = 'Database connection unavailable. Please check your internet connection.';
  } else if (error.code === 'permission-denied') {
    message = 'Access denied. Please check your permissions.';
  } else if (error.code === 'not-found') {
    message = 'Data not found';
  } else if (error.code === 'unauthenticated') {
    message = 'Authentication required. Please log in again.';
  } else if (error.code === 'cancelled') {
    message = 'Operation was cancelled';
  } else {
    message = `Error during ${operation}. Please try again.`;
  }
  
  // Only show toast if explicitly requested
  if (showToast) {
    toast.error(message);
  }
  
  return message;
};

// Optimized query builder with automatic pagination and caching
export class OptimizedQuery {
  private collectionName: string;
  private constraints: QueryConstraint[] = [];
  private pageSize: number = 25;
  private cache: Map<string, { data: DocumentData[], timestamp: number }> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  whereField(field: string, operator: any, value: any): OptimizedQuery {
    this.constraints.push(where(field, operator, value));
    return this;
  }

  orderByField(field: string, direction: 'asc' | 'desc' = 'asc'): OptimizedQuery {
    this.constraints.push(orderBy(field, direction));
    return this;
  }

  limitTo(count: number): OptimizedQuery {
    this.pageSize = count;
    this.constraints.push(limit(count));
    return this;
  }

  // Build cache key from constraints
  private getCacheKey(): string {
    return `${this.collectionName}_${JSON.stringify(this.constraints.map(c => c.toString()))}`;
  }

  // Check if cached data is still valid
  private isCacheValid(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return (Date.now() - cached.timestamp) < this.cacheTimeout;
  }

  // Execute query with caching
  async execute(): Promise<{ data: DocumentData[], error?: string }> {
    const cacheKey = this.getCacheKey();
    
    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      console.log('🚀 Firebase: Returning cached data for', this.collectionName);
      return { data: this.cache.get(cacheKey)!.data };
    }

    try {
      console.log('🔍 Firebase: Executing query for', this.collectionName);
      const q = query(collection(db, this.collectionName), ...this.constraints);
      const snapshot = await getDocs(q);
      
      const data: DocumentData[] = [];
      snapshot.forEach((doc) => {
        data.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Cache the results
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      console.log('✅ Firebase: Query completed, found', data.length, 'documents');
      return { data };

    } catch (error) {
      const errorMessage = handleFirebaseError(error, `query ${this.collectionName}`);
      return { data: [], error: errorMessage };
    }
  }

  // Set up real-time listener with error handling
  onSnapshot(
    callback: (data: DocumentData[], error?: string) => void
  ): Unsubscribe {
    try {
      console.log('🔄 Firebase: Setting up real-time listener for', this.collectionName);
      const q = query(collection(db, this.collectionName), ...this.constraints);
      
      return onSnapshot(q, 
        (snapshot) => {
          const data: DocumentData[] = [];
          snapshot.forEach((doc) => {
            data.push({
              id: doc.id,
              ...doc.data()
            });
          });
          
          console.log('🔄 Firebase: Real-time update for', this.collectionName, 'with', data.length, 'documents');
          
          // Update cache
          const cacheKey = this.getCacheKey();
          this.cache.set(cacheKey, {
            data,
            timestamp: Date.now()
          });
          
          callback(data);
        },
        (error) => {
          console.error('Firebase real-time listener error:', error);
          const errorMessage = handleFirebaseError(error, `real-time ${this.collectionName}`);
          callback([], errorMessage);
        }
      );
    } catch (error) {
      console.error('Error setting up real-time listener:', error);
      const errorMessage = handleFirebaseError(error, `listener setup ${this.collectionName}`);
      callback([], errorMessage);
      return () => {}; // Return empty unsubscribe function
    }
  }

  // Clear cache for this collection
  clearCache(): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => 
      key.startsWith(this.collectionName)
    );
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

// Factory function for creating optimized queries
export const createQuery = (collectionName: string): OptimizedQuery => {
  return new OptimizedQuery(collectionName);
};

// Retry wrapper for Firebase operations
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.log(`Operation failed, retry ${i + 1}/${maxRetries}:`, error);
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i))); // Exponential backoff
      }
    }
  }
  
  throw lastError!;
};

// Batch operation wrapper with proper error handling
export const executeBatch = async (operations: (() => Promise<any>)[]): Promise<any[]> => {
  const results = await Promise.allSettled(operations.map(op => op()));
  
  const successful = results.filter(r => r.status === 'fulfilled');
  const failed = results.filter(r => r.status === 'rejected');
  
  if (failed.length > 0) {
    console.warn(`Batch operation: ${successful.length} succeeded, ${failed.length} failed`);
    failed.forEach((failure, index) => {
      console.error(`Batch operation ${index} failed:`, failure.reason);
    });
  }
  
  return results;
};

// Connection health checker
export const checkFirebaseConnection = async (): Promise<boolean> => {
  try {
    const testQuery = createQuery('systemConfig').limitTo(1);
    await testQuery.execute();
    return true;
  } catch (error) {
    console.error('Firebase connection check failed:', error);
    return false;
  }
};