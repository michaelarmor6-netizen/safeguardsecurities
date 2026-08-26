import pandas as pd
import yfinance as yf
import vizro.plotly.express as px
from vizro import Vizro
from vizro.models.types import capture
import vizro.models as vm
from datetime import datetime, timedelta
from flask import Flask
import os

# Flask app for backend integration
app = Flask(__name__)

# Function to fetch stock data
def fetch_stock_data(tickers, start_date, end_date):
    data = yf.download(tickers, start=start_date, end=end_date, progress=False)
    return data['Adj Close'].reset_index()

# Simulate portfolio holdings
def get_portfolio_data():
    return pd.DataFrame({
        'Ticker': ['AAPL', 'MSFT', 'GOOGL', 'TSLA'],
        'Shares': [100, 50, 75, 25],
        'Cost_Basis': [150.0, 300.0, 100.0, 600.0]
    })

# Calculate portfolio metrics
def calculate_portfolio_metrics(portfolio, stock_prices):
    latest_prices = stock_prices.iloc[-1][portfolio['Ticker']].values
    portfolio['Current_Price'] = latest_prices
    portfolio['Value'] = portfolio['Shares'] * portfolio['Current_Price']
    portfolio['Returns'] = (portfolio['Current_Price'] - portfolio['Cost_Basis']) / portfolio['Cost_Basis'] * 100
    return portfolio

# Define Vizro dashboard
def create_dashboard():
    # Fetch stock data (last 30 days)
    end_date = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    tickers = ['AAPL', 'MSFT', 'GOOGL', 'TSLA']
    stock_prices = fetch_stock_data(tickers, start_date, end_date)
    
    # Prepare portfolio data
    portfolio = get_portfolio_data()
    portfolio = calculate_portfolio_metrics(portfolio, stock_prices)
    
    # Melt stock prices for line chart
    stock_prices_melted = stock_prices.melt(id_vars='Date', value_vars=tickers, 
                                           var_name='Ticker', value_name='Price')
    
    # Define dashboard pages
    page = vm.Page(
        title="Stock & Portfolio Dashboard",
        components=[
            # Line chart for stock prices
            vm.Graph(
                id="stock_price_chart",
                figure=px.line(
                    stock_prices_melted,
                    x="Date",
                    y="Price",
                    color="Ticker",
                    title="Stock Price Trends (Last 30 Days)"
                )
            ),
            # Pie chart for portfolio allocation
            vm.Graph(
                id="portfolio_allocation",
                figure=px.pie(
                    portfolio,
                    values="Value",
                    names="Ticker",
                    title="Portfolio Allocation by Value"
                )
            ),
            # Table for portfolio holdings
            vm.Table(
                id="portfolio_table",
                title="Portfolio Holdings",
                figure=px.table(
                    portfolio[['Ticker', 'Shares', 'Cost_Basis', 'Current_Price', 'Value', 'Returns']],
                    title="Portfolio Details"
                )
            )
        ],
        controls=[
            vm.Filter(column="Ticker", selector=vm.Dropdown(value=tickers, multi=True))
        ]
    )
    
    # Build dashboard
    dashboard = vm.Dashboard(pages=[page])
    return dashboard

# Flask route to serve dashboard
@app.route('/dashboard')
def serve_dashboard():
    dashboard = create_dashboard()
    return Vizro().build(dashboard).run()

# Run Flask app
if __name__ == '__main__':
    # For production, set host='0.0.0.0' and use WSGI server (e.g., Gunicorn)
    app.run(debug=True, port=8050)