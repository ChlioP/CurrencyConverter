document.getElementById('converter-form').addEventListener('submit', handleSubmit);

function handleSubmit(e) {
    e.preventDefault();

    const amount = document.getElementById('amount').value;
    const fromCurrency = document.getElementById('from-currency').value;
    const toCurrency = document.getElementById('to-currency').value;

    if (!isValidAmount(amount)) {
        alert('Please enter a valid amount');
        return;
    }

    const apiKey = 'ccc3e7abde53192f6c376238';  // Exchangerate API
    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${fromCurrency}`;

    console.log(`Fetching exchange rates from: ${url}`);

    fetch(url)
        .then(handleFetchResponse)
        .then(data => processRates(data, amount, fromCurrency, toCurrency))
        .catch(handleFetchError);
}

function isValidAmount(amount) {
    return amount !== '' && !isNaN(amount);
}

function handleFetchResponse(response) {
    console.log('Fetch response:', response);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

function processRates(data, amount, fromCurrency, toCurrency) {
    console.log('API response data:', data);
    const conversionRate = data.conversion_rates[toCurrency];
    if (conversionRate) {
        const convertedAmount = amount * conversionRate;
        displayResult(amount, fromCurrency, convertedAmount, toCurrency);
    } else {
        alert('Currency not supported.');
    }
}

function displayResult(amount, fromCurrency, convertedAmount, toCurrency) {
    document.getElementById('result').innerText = `${amount} ${fromCurrency} = ${convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${toCurrency}`;
}

function handleFetchError(error) {
    console.error('Error fetching exchange rates:', error);
    alert('Failed to fetch exchange rates. Please try again later.');
}
