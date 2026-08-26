/**
 * Strong Password Generator Utility
 * Generates secure, banking-grade passwords with customizable options
 */

export interface PasswordGeneratorOptions {
  length?: number;
  includeUppercase?: boolean;
  includeLowercase?: boolean;
  includeNumbers?: boolean;
  includeSpecialChars?: boolean;
  excludeSimilar?: boolean;
  excludeAmbiguous?: boolean;
  minUppercase?: number;
  minLowercase?: number;
  minNumbers?: number;
  minSpecialChars?: number;
}

export class PasswordGenerator {
  private static readonly DEFAULT_LENGTH = 16;
  private static readonly MIN_LENGTH = 12;
  private static readonly MAX_LENGTH = 128;
  
  // Character sets
  private static readonly UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  private static readonly LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
  private static readonly NUMBERS = '0123456789';
  private static readonly SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  // Similar looking characters to optionally exclude
  private static readonly SIMILAR_CHARS = 'il1Lo0O';
  
  // Ambiguous characters to optionally exclude
  private static readonly AMBIGUOUS_CHARS = '{}[]()/\\\'"`~,;.<>';

  /**
   * Generate a strong password with banking-grade security
   */
  static generateSecurePassword(options: PasswordGeneratorOptions = {}): string {
    const config = {
      length: Math.max(options.length || this.DEFAULT_LENGTH, this.MIN_LENGTH),
      includeUppercase: options.includeUppercase !== false,
      includeLowercase: options.includeLowercase !== false,
      includeNumbers: options.includeNumbers !== false,
      includeSpecialChars: options.includeSpecialChars !== false,
      excludeSimilar: options.excludeSimilar || false,
      excludeAmbiguous: options.excludeAmbiguous || false,
      minUppercase: Math.max(options.minUppercase || 2, 1),
      minLowercase: Math.max(options.minLowercase || 2, 1),
      minNumbers: Math.max(options.minNumbers || 2, 1),
      minSpecialChars: Math.max(options.minSpecialChars || 2, 1)
    };

    // Ensure at least one character type is enabled
    if (!config.includeUppercase && !config.includeLowercase && 
        !config.includeNumbers && !config.includeSpecialChars) {
      throw new Error('At least one character type must be enabled');
    }

    // Build character sets
    let charset = '';
    const guaranteedChars: string[] = [];

    if (config.includeUppercase) {
      let uppercaseChars = this.UPPERCASE;
      if (config.excludeSimilar) {
        uppercaseChars = this.excludeCharacters(uppercaseChars, this.SIMILAR_CHARS);
      }
      charset += uppercaseChars;
      
      // Add minimum required uppercase characters
      for (let i = 0; i < config.minUppercase; i++) {
        guaranteedChars.push(this.getRandomCharacter(uppercaseChars));
      }
    }

    if (config.includeLowercase) {
      let lowercaseChars = this.LOWERCASE;
      if (config.excludeSimilar) {
        lowercaseChars = this.excludeCharacters(lowercaseChars, this.SIMILAR_CHARS);
      }
      charset += lowercaseChars;
      
      // Add minimum required lowercase characters
      for (let i = 0; i < config.minLowercase; i++) {
        guaranteedChars.push(this.getRandomCharacter(lowercaseChars));
      }
    }

    if (config.includeNumbers) {
      let numberChars = this.NUMBERS;
      if (config.excludeSimilar) {
        numberChars = this.excludeCharacters(numberChars, this.SIMILAR_CHARS);
      }
      charset += numberChars;
      
      // Add minimum required number characters
      for (let i = 0; i < config.minNumbers; i++) {
        guaranteedChars.push(this.getRandomCharacter(numberChars));
      }
    }

    if (config.includeSpecialChars) {
      let specialChars = this.SPECIAL_CHARS;
      if (config.excludeAmbiguous) {
        specialChars = this.excludeCharacters(specialChars, this.AMBIGUOUS_CHARS);
      }
      charset += specialChars;
      
      // Add minimum required special characters
      for (let i = 0; i < config.minSpecialChars; i++) {
        guaranteedChars.push(this.getRandomCharacter(specialChars));
      }
    }

    // Generate remaining characters randomly
    const remainingLength = config.length - guaranteedChars.length;
    const randomChars: string[] = [];
    
    for (let i = 0; i < remainingLength; i++) {
      randomChars.push(this.getRandomCharacter(charset));
    }

    // Combine and shuffle all characters
    const allChars = [...guaranteedChars, ...randomChars];
    const password = this.shuffleArray(allChars).join('');
    
    // Verify the password meets all requirements
    if (!this.validateGeneratedPassword(password, config)) {
      // If validation fails, try again (recursive with limit)
      return this.generateSecurePassword(options);
    }

    return password;
  }

  /**
   * Generate multiple password suggestions
   */
  static generatePasswordSuggestions(count: number = 3, options: PasswordGeneratorOptions = {}): string[] {
    const passwords: string[] = [];
    const attempts = count * 10; // Prevent infinite loops
    
    for (let i = 0; i < attempts && passwords.length < count; i++) {
      try {
        const password = this.generateSecurePassword(options);
        if (!passwords.includes(password)) {
          passwords.push(password);
        }
      } catch (error) {
        console.warn('Password generation attempt failed:', error);
      }
    }
    
    return passwords;
  }

  /**
   * Generate a memorable but secure password using word patterns
   */
  static generateMemorablePassword(options: { wordCount?: number; separator?: string; addNumbers?: boolean } = {}): string {
    const config = {
      wordCount: options.wordCount || 4,
      separator: options.separator || '-',
      addNumbers: options.addNumbers !== false
    };

    // Simple word lists for memorable passwords
    const adjectives = ['Quick', 'Bright', 'Swift', 'Bold', 'Calm', 'Deep', 'Fast', 'High', 'Kind', 'Wise'];
    const nouns = ['River', 'Mountain', 'Ocean', 'Forest', 'Stone', 'Fire', 'Wind', 'Star', 'Moon', 'Sun'];
    const verbs = ['Jump', 'Run', 'Fly', 'Dance', 'Sing', 'Write', 'Read', 'Play', 'Build', 'Create'];
    
    const words: string[] = [];
    
    for (let i = 0; i < config.wordCount; i++) {
      let wordList: string[];
      if (i % 3 === 0) wordList = adjectives;
      else if (i % 3 === 1) wordList = nouns;
      else wordList = verbs;
      
      words.push(wordList[Math.floor(Math.random() * wordList.length)]);
    }

    let password = words.join(config.separator);
    
    if (config.addNumbers) {
      const randomNum = Math.floor(Math.random() * 9999) + 1000;
      password += config.separator + randomNum;
    }
    
    // Add special characters for banking requirements
    password += '!';
    
    return password;
  }

  /**
   * Get secure random character from character set
   */
  private static getRandomCharacter(charset: string): string {
    if (charset.length === 0) {
      throw new Error('Character set cannot be empty');
    }
    
    // Use crypto.getRandomValues for cryptographically secure random
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const randomIndex = array[0] % charset.length;
    
    return charset[randomIndex];
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      const j = array[0] % (i + 1);
      
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }

  /**
   * Exclude specific characters from a character set
   */
  private static excludeCharacters(charset: string, excludeChars: string): string {
    return charset.split('').filter(char => !excludeChars.includes(char)).join('');
  }

  /**
   * Validate that generated password meets requirements
   */
  private static validateGeneratedPassword(password: string, config: any): boolean {
    if (config.includeUppercase && !/[A-Z]/.test(password)) return false;
    if (config.includeLowercase && !/[a-z]/.test(password)) return false;
    if (config.includeNumbers && !/\d/.test(password)) return false;
    if (config.includeSpecialChars && !/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) return false;
    
    return true;
  }

  /**
   * Estimate password entropy (bits of entropy)
   */
  static calculateEntropy(password: string): number {
    let charsetSize = 0;
    
    if (/[a-z]/.test(password)) charsetSize += 26;
    if (/[A-Z]/.test(password)) charsetSize += 26;
    if (/\d/.test(password)) charsetSize += 10;
    if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) charsetSize += 32;
    
    return Math.log2(Math.pow(charsetSize, password.length));
  }

  /**
   * Get password strength assessment
   */
  static assessPasswordStrength(password: string): { strength: string; entropy: number; recommendation: string } {
    const entropy = this.calculateEntropy(password);
    
    let strength: string;
    let recommendation: string;
    
    if (entropy >= 80) {
      strength = 'Excellent';
      recommendation = 'This password provides excellent security for banking applications.';
    } else if (entropy >= 60) {
      strength = 'Very Strong';
      recommendation = 'This password is very strong and suitable for banking use.';
    } else if (entropy >= 40) {
      strength = 'Strong';
      recommendation = 'This password is strong but could be improved for banking security.';
    } else if (entropy >= 25) {
      strength = 'Moderate';
      recommendation = 'Consider using a longer password with more character types.';
    } else {
      strength = 'Weak';
      recommendation = 'This password is too weak for banking applications. Please generate a stronger one.';
    }
    
    return { strength, entropy, recommendation };
  }
}