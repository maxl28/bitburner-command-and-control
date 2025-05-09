//Requires access to the TIX API and the 4S Mkt Data API

let fracL = 0.1; //Fraction of assets to keep as cash in hand

let fracH = 0.2;

let commission = 100000; //Buy or sell commission

let numCycles = 2; //Each cycle is 5 seconds

function refresh(ns, stocks, myStocks){

let corpus = ns.getServerMoneyAvailable("home");

myStocks.length = 0;

for(const element of stocks){

let sym = element.sym;

element.price = ns.stock.getPrice(sym);

element.shares = ns.stock.getPosition(sym)[0];

element.buyPrice = ns.stock.getPosition(sym)[1];

element.vol = ns.stock.getVolatility(sym);

element.prob = 2* (ns.stock.getForecast(sym) - 0.5);

element.expRet = element.vol * element.prob / 2;

corpus += element.price * element.shares;

if(element.shares > 0) myStocks.push(element);

}

stocks.sort(function(a, b){return b.expRet - a.expRet});

return corpus;

}

function buy(ns, stock, numShares){

ns.stock.buy(stock.sym, numShares);

ns.print(`Bought ${stock.sym} for ${ns.nFormat(numShares * stock.price, '$0.000a')}`);

}

function sell(ns, stock, numShares){

let profit = numShares * (stock.price - stock.buyPrice) - 2 * commission;

ns.print(`Sold ${stock.sym} for profit of ${ns.nFormat(profit, '$0.000a')}`);

ns.stock.sell(stock.sym, numShares);

}

export async function main(ns) {

//Initialise

ns.disableLog("ALL");

let stocks = [];

let myStocks = [];

let corpus = 0;

for(const element of ns.stock.getSymbols())

stocks.push({sym:element});

while(true){

corpus = refresh(ns, stocks, myStocks);

//Sell underperforming shares

for (const element of myStocks){

if(stocks[0].expRet > element.expRet){

sell(ns, element, element.shares);

corpus -= commission;

}

}

//Sell shares if not enough cash in hand

for (const element of myStocks){

if( ns.getServerMoneyAvailable("home") < (fracL * corpus)){

let cashNeeded = (corpus * fracH - ns.getServerMoneyAvailable("home") + commission);

let numShares = Math.floor(cashNeeded/element.price);

sell(ns, element, numShares);

corpus -= commission;

}

}

//Buy shares with cash remaining in hand

let cashToSpend = ns.getServerMoneyAvailable("home") - (fracH * corpus);

let numShares = Math.floor((cashToSpend - commission)/stocks[0].price);

if ((numShares * stocks[0].expRet * stocks[0].price * numCycles) > commission)

buy(ns, stocks[0], numShares);

await ns.sleep(5 * 1000 * numCycles + 200);

}

}