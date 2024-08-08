document.getElementById('converter-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const amount = document.getElementById('amount').value;
    const fromCurrency = document.getElementById('from-currency').value;
    const toCurrency = document.getElementById('to-currency').value;

    if (amount === '' || isNaN(amount)) {
        alert('Please enter a valid amount');
        return;
    }

    const apiKey = 5999e34b30ddb11a20f72b09ed93ff2c;  //From Currency Layer 
    const url = `htts://api.currencylayer.com/live?access_key=${apiKey}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            const rates = data.quotes;
            const fromRate = rates[`USD${fromCurrency}`];
            const toRate = rates[`USD${toCurrency}`];
            const convertedAmount = (amount / fromRate) * toRate;
            document.getElementById('result').innerText = `${amount} ${fromCurrency} = ${convertedAmount.toFixed(2)} ${toCurrency}`;
        })
        .catch(error => {
            console.error('Error fetching exchange rates:', error);
            alert('Failed to fetch exchange rates. Please try again later.');
        });
});
