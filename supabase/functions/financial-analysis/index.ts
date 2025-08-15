import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  category?: string
  subcategory?: string
  type: 'income' | 'expense'
}

interface CategorizationRequest {
  transactions: Transaction[]
  action: 'categorize' | 'analyze' | 'categorize-savings'
}

interface FinancialMetrics {
  netWorth: number
  totalIncome: number
  totalExpenses: number
  incomeSurplus: number
  savingsRate: number
  topExpenseCategories: Array<{ category: string; amount: number; percentage: number }>
  monthlyTrends: Array<{ month: string; income: number; expenses: number; surplus: number }>
  insights: string[]
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { transactions, action }: CategorizationRequest = await req.json()

    if (!transactions || !Array.isArray(transactions)) {
      return new Response(
        JSON.stringify({ error: 'Invalid transactions data' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.warn('OpenAI API key not configured, using fallback categorization')
      // Use fallback categorization when API key is not available
      if (action === 'categorize') {
        const categorizedTransactions = categorizeTransactionsFallback(transactions)
        return new Response(
          JSON.stringify({ categorizedTransactions }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    if (action === 'categorize') {
      // Categorize transactions using OpenAI
      const categorizedTransactions = await categorizeTransactions(transactions, openaiApiKey)
      
      return new Response(
        JSON.stringify({ categorizedTransactions }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else if (action === 'analyze') {
      // Calculate metrics and generate insights
      const metrics = await analyzeFinancialData(transactions, openaiApiKey)
      
      return new Response(
        JSON.stringify({ metrics }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else if (action === 'categorize-savings') {
      // Categorize savings transactions
      const categorizedSavings = await categorizeSavingsTransactions(transactions, openaiApiKey)
      
      return new Response(
        JSON.stringify({ categorizedSavings }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in financial-analysis function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function categorizeTransactions(transactions: Transaction[], apiKey: string): Promise<Transaction[]> {
  const uncategorizedTransactions = transactions.filter(t => !t.category || t.category === 'Uncategorized')
  
  if (uncategorizedTransactions.length === 0) {
    return transactions
  }

  // Process transactions in batches of 10 to avoid token limits
  const batchSize = 10
  const categorizedTransactions = [...transactions]
  
  for (let i = 0; i < uncategorizedTransactions.length; i += batchSize) {
    const batch = uncategorizedTransactions.slice(i, i + batchSize)
    
    const prompt = `
You are a financial categorization expert. Categorize the following transactions into appropriate categories and subcategories.

Available Categories:
EXPENSE CATEGORIES:
- Living Expenses (Grocery, Maids, Fruits & Vegetables, Food, Household Items, Utilities, Electricity, Gas, Water, Internet, Phone, Personal Care, Toiletries, Laundry, Kitchen Supplies)
- Rental (House Rent, Apartment Rent, Office Rent, Parking Rent, Storage Rent, Equipment Rent)
- Debt (Car Loan, Home Loan, Personal Loan, Credit Card Payment, Student Loan, Business Loan, EMI, Interest Payment)
- Education (School Fees, Tuition, College Fees, Training, Courses, Books, Educational Materials, Exam Fees, Coaching)
- Healthcare (Medical Bills, Doctor Consultation, Medicine, Hospital, Dental, Health Insurance, Lab Tests, Surgery, Therapy)
- Transportation (Fuel, Car Maintenance, Public Transport, Taxi, Uber, Bus, Train, Flight, Car Insurance, Vehicle Registration)
- Entertainment (Movies, Dining Out, Vacation, Sports, Hobbies, Subscriptions, Netflix, Spotify, Gaming, Books)
- Shopping (Clothes, Electronics, Gifts, Jewelry, Furniture, Home Decor, Appliances, Personal Items)
- Insurance (Life Insurance, Health Insurance, Car Insurance, Home Insurance, Travel Insurance, Professional Insurance)
- Taxes (Income Tax, Property Tax, GST, Professional Tax, Vehicle Tax, Other Taxes)
- Charity (Donations, Religious Contributions, NGO Support, Community Support)
- Savings (SIPs, Fixed Deposits, Recurring Deposits, Emergency Fund, Investment Savings, Retirement Savings)
- Other (Miscellaneous, Bank Charges, Legal Fees, Professional Services, Repairs, Maintenance)

INCOME CATEGORIES:
- Salary (Salary, Wages, Bonus, Overtime, Commission, Tips, Freelance Income, Consulting Income)
- Dividend (Dividends, Interest, Capital Gains, Mutual Fund Returns, Stock Profits, Bond Interest, Crypto Gains)
- Rental Income (Property Rent, Room Rent, Commercial Rent, Parking Rent, Equipment Rental, Airbnb Income)
- Business (Business Profits, Partnership Income, Royalties, Licensing, Product Sales, Service Income)
- Other (Gifts, Inheritance, Insurance Claims, Refunds, Cashback, Prize Money, Government Benefits, Pension)

Transactions to categorize:
${batch.map(t => `- ${t.description} ($${t.amount}) [${t.type}]`).join('\n')}

Rules:
1. Determine if each transaction is "income" or "expense" based on the description
2. Choose the most appropriate category and subcategory
3. Salary, dividend, rental income -> Salary, Dividend, Rental Income respectively
4. House rent -> Rental category
5. Grocery, maids, fruits & vegetables -> Living Expenses
6. Car loan and home loan -> Debt category
7. School fees and tuition -> Education category
8. SIPs should be categorized as Savings (this represents income minus all expenses)
9. Use specific subcategories that match the transaction description closely

Return a JSON array with the same order, each containing:
{
  "category": "category_name",
  "subcategory": "subcategory_name",
  "type": "income" or "expense",
  "confidence": 0.95
}

Only return the JSON array, no other text.`

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a financial categorization expert. Always respond with valid JSON only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 1000
        })
      })

      if (!response.ok) {
        console.error('OpenAI API error:', response.status, await response.text())
        continue
      }

      const data = await response.json()
      const categorizations = JSON.parse(data.choices[0].message.content)

      // Apply categorizations to transactions
      batch.forEach((transaction, index) => {
        if (categorizations[index]) {
          const transactionIndex = categorizedTransactions.findIndex(t => t.id === transaction.id)
          if (transactionIndex !== -1) {
            categorizedTransactions[transactionIndex] = {
              ...categorizedTransactions[transactionIndex],
              category: categorizations[index].category,
              subcategory: categorizations[index].subcategory,
              type: categorizations[index].type || categorizedTransactions[transactionIndex].type
            }
          }
        }
      })

    } catch (error) {
      console.error('Error categorizing batch:', error)
    }
  }

  return categorizedTransactions
}

async function categorizeSavingsTransactions(transactions: Transaction[], apiKey: string): Promise<any[]> {
  if (!apiKey) {
    // Fallback categorization for savings
    return transactions.map(t => {
      const description = t.description?.toLowerCase() || '';
      
      if (description.includes('sip') || description.includes('systematic')) {
        return { category: 'SIP' };
      } else if (description.includes('mutual fund') || description.includes('mf')) {
        return { category: 'Mutual Fund' };
      } else if (description.includes('stock') || description.includes('equity')) {
        return { category: 'Stocks' };
      } else if (description.includes('fd') || description.includes('fixed deposit')) {
        return { category: 'FD' };
      } else if (description.includes('rd') || description.includes('recurring deposit')) {
        return { category: 'RD' };
      } else if (description.includes('aif') || description.includes('alternative investment')) {
        return { category: 'AIF' };
      } else {
        return { category: 'Other Savings' };
      }
    });
  }

  const prompt = `
Categorize the following savings/investment transactions into these specific categories:
- SIP (Systematic Investment Plan)
- Mutual Fund (Direct mutual fund investments)
- Stocks (Direct stock/equity investments)
- FD (Fixed Deposits)
- RD (Recurring Deposits)  
- AIF (Alternative Investment Funds)
- Other Savings (Any other savings not fitting above categories)

Transactions to categorize:
${transactions.map(t => `- ${t.description} ($${t.amount})`).join('\n')}

Rules:
1. SIP for systematic investment plans, monthly SIPs
2. Mutual Fund for direct mutual fund investments (not SIPs)
3. Stocks for direct stock purchases, equity investments
4. FD for fixed deposits, term deposits
5. RD for recurring deposits
6. AIF for alternative investment funds, hedge funds, etc.
7. Other Savings for any savings not fitting the above

Return a JSON array with the same order, each containing:
{
  "category": "category_name"
}

Only return the JSON array, no other text.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a financial categorization expert for savings and investments. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      console.error('OpenAI API error for savings categorization:', response.status);
      return transactions.map(() => ({ category: 'Other Savings' }));
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);

  } catch (error) {
    console.error('Error categorizing savings:', error);
    return transactions.map(() => ({ category: 'Other Savings' }));
  }
}

function categorizeTransactionsFallback(transactions: Transaction[]): Transaction[] {
  return transactions.map(transaction => {
    const description = transaction.description.toLowerCase()
    
    // Income keywords
    const incomeKeywords = [
      'salary', 'wage', 'wages', 'bonus', 'income', 'pay', 'paycheck', 'payment',
      'dividend', 'interest', 'rent income', 'freelance', 'commission', 'refund',
      'cashback', 'reimbursement', 'allowance', 'stipend', 'pension', 'benefits'
    ]
    const isIncome = incomeKeywords.some(keyword => description.includes(keyword))
    
    if (isIncome) {
      if (description.includes('salary') || description.includes('wage') || description.includes('bonus')) {
        return { ...transaction, type: 'income', category: 'Salary', subcategory: 'Salary' }
      }
      if (description.includes('dividend') || description.includes('interest')) {
        return { ...transaction, type: 'income', category: 'Dividend', subcategory: 'Dividends' }
      }
      if (description.includes('rent income') || description.includes('rental income')) {
        return { ...transaction, type: 'income', category: 'Rental Income', subcategory: 'Property Rent' }
      }
      return {
        ...transaction,
        type: 'income',
        category: 'Salary',
        subcategory: 'Salary'
      }
    }
    
    // Expense categorization
    if (description.includes('grocery') || description.includes('maids') || description.includes('fruits') || description.includes('vegetables') || description.includes('food')) {
      return { ...transaction, type: 'expense', category: 'Living Expenses', subcategory: 'Grocery' }
    }
    
    // Investment/Savings categorization - MUST come before other expense checks
    if (description.includes('sip') || description.includes('systematic investment')) {
      return { ...transaction, type: 'expense', category: 'Savings', subcategory: 'SIPs' }
    }
    
    if (description.includes('mutual fund') || description.includes('mf ') || description.includes(' mf') || description.includes('mutual') || description.includes('fund')) {
      return { ...transaction, type: 'expense', category: 'Savings', subcategory: 'Mutual Fund' }
    }
    
    if (description.includes('stock') || description.includes('stocks') || description.includes('equity') || description.includes('shares')) {
      return { ...transaction, type: 'expense', category: 'Savings', subcategory: 'Stocks' }
    }
    
    if (description.includes('fd ') || description.includes(' fd') || description.includes('fixed deposit') || description.includes('fd') || description.includes('deposit')) {
      return { ...transaction, type: 'expense', category: 'Savings', subcategory: 'Fixed Deposits' }
    }
    
    if (description.includes('rd ') || description.includes(' rd') || description.includes('recurring deposit') || description.includes('recurring')) {
      return { ...transaction, type: 'expense', category: 'Savings', subcategory: 'Recurring Deposits' }
    }
    
    if (description.includes('aif') || description.includes('alternative investment')) {
      return { ...transaction, type: 'expense', category: 'Savings', subcategory: 'AIF' }
    }
    
    // Additional savings keywords
    if (description.includes('investment') || description.includes('invest') || description.includes('saving') || description.includes('ppf') || description.includes('nsc') || description.includes('elss')) {
      return { ...transaction, type: 'expense', category: 'Savings', subcategory: 'Investment Savings' }
    }
    
    if (description.includes('house rent') || description.includes('rent')) {
      return { ...transaction, type: 'expense', category: 'Rental', subcategory: 'House Rent' }
    }
    
    if (description.includes('car loan') || description.includes('home loan') || description.includes('loan') || description.includes('emi')) {
      return { ...transaction, type: 'expense', category: 'Debt', subcategory: 'Car Loan' }
    }
    
    if (description.includes('school fees') || description.includes('tuition') || description.includes('education')) {
      return { ...transaction, type: 'expense', category: 'Education', subcategory: 'School Fees' }
    }
    
    if (description.includes('gas') || description.includes('uber') || description.includes('taxi') || description.includes('bus')) {
      return { ...transaction, type: 'expense', category: 'Transportation', subcategory: 'Taxi' }
    }
    
    if (description.includes('movie') || description.includes('netflix') || description.includes('spotify') || description.includes('entertainment') || description.includes('vacation') || description.includes('holiday') || description.includes('restaurant') || description.includes('dining')) {
      return { ...transaction, type: 'expense', category: 'Entertainment', subcategory: 'Movies' }
    }
    
    if (description.includes('medical') || description.includes('doctor') || description.includes('hospital') || description.includes('pharmacy') || description.includes('medicine')) {
      return { ...transaction, type: 'expense', category: 'Healthcare', subcategory: 'Medical Bills' }
    }
    
    if (description.includes('utilities') || description.includes('electricity') || description.includes('water') || description.includes('gas bill')) {
      return { ...transaction, type: 'expense', category: 'Living Expenses', subcategory: 'Utilities' }
    }
    
    // Default to Other for unrecognized expenses
    return {
      ...transaction,
      type: 'expense',
      category: 'Other',
      subcategory: 'Miscellaneous'
    }
  })
}

async function analyzeFinancialData(transactions: Transaction[], apiKey: string): Promise<FinancialMetrics> {
  // Calculate basic metrics
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const savingsTransactions = transactions
    .filter(t => t.type === 'expense' && t.category === 'Savings')
    .reduce((sum, t) => sum + t.amount, 0)

  const netWorth = savingsTransactions // Simplified - in reality would include all assets
  const incomeSurplus = totalIncome - totalExpenses
  const savingsRate = totalIncome > 0 ? (savingsTransactions / totalIncome) * 100 : 0

  // Calculate top expense categories
  const expensesByCategory = transactions
    .filter(t => t.type === 'expense' && t.category !== 'Savings')
    .reduce((acc, t) => {
      acc[t.category || 'Uncategorized'] = (acc[t.category || 'Uncategorized'] || 0) + t.amount
      return acc
    }, {} as Record<string, number>)

  const topExpenseCategories = Object.entries(expensesByCategory)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: (amount / (totalExpenses - savingsTransactions)) * 100
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  // Calculate monthly trends (simplified)
  const monthlyTrends = calculateMonthlyTrends(transactions)

  // Generate AI insights
  const insights = await generateFinancialInsights(
    { totalIncome, totalExpenses, incomeSurplus, savingsRate, topExpenseCategories, monthlyTrends },
    apiKey
  )

  return {
    netWorth,
    totalIncome,
    totalExpenses,
    incomeSurplus,
    savingsRate,
    topExpenseCategories,
    monthlyTrends,
    insights
  }
}

function calculateMonthlyTrends(transactions: Transaction[]) {
  const monthlyData = transactions.reduce((acc, t) => {
    const month = new Date(t.date).toISOString().slice(0, 7) // YYYY-MM
    if (!acc[month]) {
      acc[month] = { income: 0, expenses: 0 }
    }
    
    if (t.type === 'income') {
      acc[month].income += t.amount
    } else {
      acc[month].expenses += t.amount
    }
    
    return acc
  }, {} as Record<string, { income: number; expenses: number }>)

  return Object.entries(monthlyData)
    .map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
      surplus: data.income - data.expenses
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6) // Last 6 months
}

async function generateFinancialInsights(metrics: Partial<FinancialMetrics>, apiKey: string): Promise<string[]> {
  if (!apiKey) {
    // Enhanced fallback insights
    const insights = [];
    
    // Debt to income analysis
    const debtToIncomeRatio = calculateDebtToIncomeRatio(metrics);
    if (debtToIncomeRatio > 36) {
      insights.push(`Your debt-to-income ratio is ${debtToIncomeRatio.toFixed(1)}%, which is above the recommended 36%. Consider paying down high-interest debt first, starting with credit cards, then personal loans. Focus on the debt avalanche method - pay minimums on all debts, then put extra money toward the highest interest rate debt.`);
    } else {
      insights.push(`Your debt-to-income ratio of ${debtToIncomeRatio.toFixed(1)}% is healthy and within recommended limits. This gives you flexibility to increase investments or build emergency funds.`);
    }
    
    // Investment pattern analysis
    const investmentAnalysis = analyzeInvestmentPattern(metrics);
    insights.push(investmentAnalysis);
    
    // Credit card recommendations
    const creditCardRec = generateCreditCardRecommendations(metrics);
    insights.push(creditCardRec);
    
    // General financial health
    if (metrics.savingsRate && metrics.savingsRate < 15) {
      insights.push(`Your savings rate of ${metrics.savingsRate.toFixed(1)}% is below the recommended 15%. Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings. Start by tracking expenses and identifying areas to cut back.`);
    } else if (metrics.savingsRate && metrics.savingsRate >= 15) {
      insights.push(`Excellent! Your savings rate of ${metrics.savingsRate.toFixed(1)}% exceeds the recommended 15%. Consider increasing your investment allocation or exploring tax-advantaged accounts.`);
    }
    
    return insights;
  }

  const prompt = `
You are a comprehensive financial advisor. Analyze the following financial data and provide detailed insights in these specific areas:

Total Income: $${metrics.totalIncome?.toFixed(2)}
Total Expenses: $${metrics.totalExpenses?.toFixed(2)}
Income Surplus: $${metrics.incomeSurplus?.toFixed(2)}
Savings Rate: ${metrics.savingsRate?.toFixed(1)}%

Top Expense Categories:
${metrics.topExpenseCategories?.map(cat => `- ${cat.category}: $${cat.amount.toFixed(2)} (${cat.percentage.toFixed(1)}%)`).join('\n')}

Monthly Trends (last 6 months):
${metrics.monthlyTrends?.map(trend => `${trend.month}: Income $${trend.income.toFixed(2)}, Expenses $${trend.expenses.toFixed(2)}, Surplus $${trend.surplus.toFixed(2)}`).join('\n')}

REQUIRED ANALYSIS AREAS:

1. DEBT-TO-INCOME RATIO ANALYSIS:
   - Calculate debt-to-income ratio from the data
   - If >36%, provide specific recommendations for debt reduction
   - If ≤36%, acknowledge healthy ratio and suggest optimization

2. INVESTMENT PATTERN ANALYSIS:
   - Analyze current equity vs fixed-income investment allocation
   - Recommend optimal asset allocation based on apparent risk profile
   - Suggest specific investment vehicles (SIPs, mutual funds, etc.)

3. CREDIT CARD RECOMMENDATIONS:
   - Based on top spending categories, recommend specific credit cards
   - If high grocery/dining spending, suggest cashback cards
   - If high travel/transportation, suggest travel rewards cards
   - Provide specific card names and key benefits

4. OVERALL FINANCIAL HEALTH:
   - Assess savings rate and provide improvement strategies
   - Identify spending optimization opportunities
   - Emergency fund recommendations

Provide 4-6 detailed, actionable insights as a JSON array of strings. Each insight should be specific, practical, and include concrete recommendations or next steps.

Return only a JSON array of insight strings, no other text.`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a comprehensive financial advisor with expertise in debt management, investment allocation, and credit card optimization. Provide detailed, actionable insights with specific recommendations. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1200
      })
    })

    if (!response.ok) {
      console.error('OpenAI API error for insights:', response.status)
      return ['Unable to generate insights at this time.']
    }

    const data = await response.json()
    return JSON.parse(data.choices[0].message.content)

  } catch (error) {
    console.error('Error generating insights:', error)
    return ['Unable to generate insights at this time.']
  }
}

function calculateDebtToIncomeRatio(metrics: Partial<FinancialMetrics>): number {
  if (!metrics.topExpenseCategories || !metrics.totalIncome) return 0;
  
  const debtExpenses = metrics.topExpenseCategories
    .filter(cat => cat.category === 'Debt')
    .reduce((sum, cat) => sum + cat.amount, 0);
  
  return metrics.totalIncome > 0 ? (debtExpenses / metrics.totalIncome) * 100 : 0;
}

function analyzeInvestmentPattern(metrics: Partial<FinancialMetrics>): string {
  if (!metrics.topExpenseCategories) {
    return "Unable to analyze investment pattern. Consider diversifying your portfolio with a mix of equity (60-70%) and fixed-income investments (30-40%) based on your risk tolerance and age.";
  }
  
  const savingsCategories = metrics.topExpenseCategories.filter(cat => cat.category === 'Savings');
  if (savingsCategories.length === 0) {
    return "No investment data found. Start with SIPs in diversified equity mutual funds for long-term growth, and consider adding debt funds for stability. Aim for 70% equity and 30% debt allocation if you're under 40.";
  }
  
  return "Based on your investment pattern, consider rebalancing your portfolio annually. If heavily invested in equity, add some debt funds for stability. If too conservative, increase equity allocation for better long-term returns. Consider tax-saving ELSS funds and PPF for tax benefits.";
}

function generateCreditCardRecommendations(metrics: Partial<FinancialMetrics>): string {
  if (!metrics.topExpenseCategories) {
    return "For general spending, consider cards like HDFC Millennia (cashback on online spending), SBI SimplyCLICK (online shopping rewards), or ICICI Amazon Pay (Amazon purchases). Always pay full balance to avoid interest charges.";
  }
  
  const topCategory = metrics.topExpenseCategories[0];
  if (!topCategory) {
    return "Consider a general cashback card like Citi Double Cash or HDFC Cashback Card for 1-2% returns on all purchases.";
  }
  
  switch (topCategory.category) {
    case 'Living Expenses':
      return "For high grocery/daily expenses, consider HDFC Millennia (2.5% on groceries), ICICI Amazon Pay (2% on Amazon), or SBI Simply Save (5% on groceries up to ₹2000/month). These cards maximize returns on essential spending.";
    case 'Transportation':
      return "For high fuel/travel expenses, consider HDFC Regalia (4 reward points per ₹150 on fuel), ICICI HPCL Super Saver (fuel surcharge waiver + rewards), or IndianOil Citibank Card (4% fuel savings). Also look at travel cards like Axis Magnus for flight bookings.";
    case 'Entertainment':
      return "For dining and entertainment, consider HDFC Swiggy Card (10% on Swiggy, 5% on dining), Zomato RBL Card (10% on Zomato), or ICICI Sapphiro (2 reward points per ₹100 on dining and movies).";
    default:
      return "Based on your spending pattern, consider a general rewards card like HDFC Regalia (comprehensive rewards), Axis Ace (Google Pay cashback), or SBI Prime (reward points on all categories). Focus on cards with no annual fee or fee waiver conditions.";
  }
}