export const fmtUSD = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
