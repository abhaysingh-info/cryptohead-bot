const {prefix, domain} = require("../data/config.json");
const fetch = require("node-fetch");
const {coins} = require("../data/coins.json");
const errors = require("../data/errors.json");
const MongoClient = require("mongodb").MongoClient;

const url = process.env.SCARYTRADER_MONGODB_HOST

let collection = null
// MongoClient.connect(url,{ useUnifiedTopology: true }, function(err, db) {
//     if (err) throw err;
//     var dbo = db.db("scarytrader");
//     collection = dbo.collection("discord_servers")
// });

module.exports["message"] = (client, aliases, callback) => {
    if(typeof aliases === "string"){
        aliases = [aliases];
    }

    client.on("message", (message) => {
        const {content} = message;
        // new code

        aliases.forEach(async (alias) => {
            const command = `${prefix}${alias}`;
            if(content.startsWith(command)){
                const guild_id = message.guild.id.toString()
                callback(message);
                // await collection.findOne({guild_id: guild_id}, (err, result) => {
                //     if(err) {throw err};
                //     if(result){
                //         const _date = new Date();
                //         const year = _date.getFullYear();
                //         const month = ("0" + (_date.getMonth() + 1)).slice(-2)
                //         const date = ("0" + _date.getDate()).slice(-2)
                        
                //         const today = `${year}-${month}-${date}`
                //         if(result.expires_on !== today){
                //             callback(message);
                //         }else {
                //             message.channel.send(`${message.author}, Subscription for this server has been expired, please ask serevr Owner to purchase it again.`)
                //         }
                //     }else {
                //         message.channel.send(`${message.author}, ask server Owner to buy Subscription for this bot from ${domain}.`);
                //     }
                // })
            }
        });
    });
}


module.exports["create_url"] = (website, path="") => {
    return website + path
}

module.exports["replaceAuthor"] = function (message, content="") {
    return content.replace(/\<author\>/g, message);
}

module.exports["getCoinInfo"] = function (name) {
    return(coins.filter((coin) => {
        return(coin.id === name || coin.symbol === name || coin.name.toLowerCase() === name);
    }));
}

module.exports["sepreateUserInput"] = function (msg) {
    return msg.split(" ").filter(obj => obj.replace(' ', ''))
}

module.exports["usageError"] = function (name, cmd, usage) {
    return this.replaceAuthor(name, errors.usage_error.output).replace(/\<command\>/g, cmd).replace(/\<command_usage\>/g, usage)
}

module.exports["coinNotFoundError"] = function (name, initial) {
    return this.replaceAuthor(name, errors.coin_not_found_error.output).replace(/\<coin\>/g, initial)
}

module.exports["failedToFetchError"] = function (name) {
    return `Sorry, ${name} there was an error in fetching data for you please try again in some times...`
}




module.exports["help"] = (commands={}) => {
    output = "";
    initial = 1;
    for(let key in commands) {
        output += `${initial}) ${prefix}${commands[key]["usage"]} : ${commands[key]["what"]}\n\n`;
        initial += 1;
    }
    return output;
}

module.exports["validateInput"] = function (message, commands={}, min_inputs=1) {
    const inputs = this.sepreateUserInput(message.content);
    if(inputs.length >= min_inputs){
        return inputs
    }else {
        message.channel.send(this.usageError(message.author, inputs[0], commands[inputs[0].replace(prefix, "")]["usage"]))
    }

    return false
}

module.exports["validateCoin"] = function (message, commands, api, min_inputs=2) {
    inputs = this.validateInput(message, commands, min_inputs);
    let coin = null
    if(inputs === false) {
        return false;
    }else {
        coin = this.getCoinInfo(inputs[1]);
        if(coin.length < 1){
            message.channel.send(this.coinNotFoundError(message.author, inputs[1]))
            return false;
        }
    }
    return {inputs: inputs, coin: coin[0]}
}

module.exports["description"] = async (message, commands={}, api="", min_inputs=2) => {
    const coinInput = this.validateCoin(message, commands, api, min_inputs);
    if(coinInput !== false){
        const {inputs, coin} = coinInput;
        await fetch(this.create_url(api, `coins/${coin.id}?tickers=false`)).then(resp => resp.json()).then(data => {
            if(data.error){
                message.channel.send(`${message.author}, ${data.error}`)
            }else {
                let description = data.description["en"].split("\r").join('').split("\r").join('').replace(/(<([^>]+)>)/g, "").replace(/(<\/([^>]+)>)/g, '');
                
                message.channel.send(
                    this.replaceAuthor(message.author, commands["description"]["output"]).replace(/\<coin_name\>/g, data.name).replace(/\<description\>/, description)
                )
            }
        }).catch(error => {
            console.log(error)
            message.channel.send(this.failedToFetchError(message.author))
        })
    }
}

module.exports["price"] = async (message, commands={}, api="", min_inputs=2) => {
    const coinInput = this.validateCoin(message, commands, api, min_inputs);
    if(coinInput !== false){
        const {inputs, coin} = coinInput;
        currency = inputs[2] ? inputs[2].toUpperCase() : "USD";
        await fetch(this.create_url(api, `simple/price?ids=${coin.id}&vs_currencies=${currency}`)).then(resp => resp.json()).then(data => {
            let output = this.replaceAuthor(message.author, commands["price"]["output"]).replace(/\<coin_name\>/g, coin.name).replace(/\<currency_value\>/g, data[coin.id][currency.toLowerCase()]).replace(/\<currency_initial\>/g, currency)
            message.channel.send(output)
        }).catch(error => {
            console.log(error)
            message.channel.send(this.failedToFetchError(message.author))
        })
    }
}


module.exports["sharesPretify"] = function (data) {
    let newMsg = ""
    let max = 100
    let marketData = data.data.market_cap_percentage
    let num = 1
    for(let key in marketData){
        let coin = this.getCoinInfo(key)[0]
        newMsg += `${num}) ${coin.name} (${coin.symbol.toUpperCase()}): ${marketData[key].toFixed(2)}%\n`
        num += 1
        max -= marketData[key].toFixed(2)
    }
    newMsg += `${num}) Other Currencies: ${max.toFixed(2)}%\n`
    return newMsg;
}

module.exports["shares"] = async (message, commands={}, api="", min_inputs=1) => {
    inputs = this.validateInput(message, commands, min_inputs);
    if(inputs !== false) {
        await fetch(this.create_url(api, `global/`)).then(resp => resp.json()).then(data => {
            message.channel.send(this.replaceAuthor(message.author, commands["shares"]["output"]).replace(/\<shares\>/g, this.sharesPretify(data)))
        }).catch(error => {
            console.log(error)
            message.channel.send(this.failedToFetchError(message.author))
        })
    }
}


module.exports["trendingPretify"] = function (data) {
    msg = ""
    data.coins.forEach((coin, index) => {
        msg += `${index + 1}) ${coin.item.name} (${coin.item.symbol}) with rank of #${coin.item.market_cap_rank}\n`
    })
    return msg;
}

module.exports["trending"] = async (message, commands={}, api="", min_inputs=1) => {
    inputs = this.validateInput(message, commands, min_inputs);
    if(inputs !== false) {
        await fetch(this.create_url(api, "search/trending/")).then(resp => resp.json()).then((data) => {
            message.channel.send(this.replaceAuthor(message.author, commands["trending"]["output"]).replace(/\<trending\>/g, this.trendingPretify(data)))
        }).catch((err) => {
            console.log(err)
            message.channel.send(this.failedToFetchError(message.author))
        })
    }
}

module.exports["market"] = async (message, commands={}, api="", min_inputs=1) => {
    inputs = this.validateInput(message, commands, min_inputs);
    if(inputs !== false) {
        await fetch(this.create_url(api, `global/`)).then(resp => resp.json()).then(data => {
            let output = this.replaceAuthor(message.author, commands["market"]["output"])

            output = output.replace(/\<active_crypto\>/g, data.data.active_cryptocurrencies)
            output = output.replace(/\<upcomming_ico\>/g, data.data.upcoming_icos)
            output = output.replace(/\<ended_ico\>/g, data.data.ended_icos)
            output = output.replace(/\<total_market\>/g, data.data.markets)

            message.channel.send(output)
        }).catch(error => {
            console.log(error)
            message.channel.send(this.failedToFetchError(message.author))
        })
    }
}

module.exports["feeling"] = async (message, commands={}, api="", min_inputs=2) => {
    const coinInput = this.validateCoin(message, commands, min_inputs);
    if(coinInput !== false) {
        const {inputs, coin} = coinInput;
        delete coinInput;
        // console.log(inputs)
        await fetch(this.create_url(api, `coins/${coin.id}?tickers=false`)).then(resp => resp.json()).then(data => {
            if(data.error){
                message.channel.send(`${message.author}, ${data.error}`)
            }else {
                let sentiment = data.sentiment_votes_up_percentage ? data.sentiment_votes_up_percentage : 0
                let output = this.replaceAuthor(message.author, commands["feeling"]["output"]).replace(/\<sentiment_vote_up\>/g, sentiment).replace(/\<coin_name\>/g, data.name).replace(/\<emoji\>/g, sentiment > 50 ? ":smile:" : ":cry:")
                message.channel.send(output)
            }
        }).catch(error => {
            console.log(error)
            message.channel.send(this.failedToFetchError(message.author))
        })
    }
}

module.exports["chart"] = async (message, commands={}, api="", min_inputs=2, url="http://127.0.0.1:8000") => {
    const coinInput = this.validateCoin(message, commands, min_inputs);
    if(coinInput !== false) {
        const {inputs, coin} = coinInput;
        delete coinInput;
        message.channel.send(this.replaceAuthor(message.author, commands["chart"]["output"]).replace(/\<coin_name\>/g, coin.name).replace(/\<coin_symbol\>/g, coin.symbol).replace(/\<url\>/g, url + '/coin?coinId=' + coin.id));
    }
}


module.exports["eventPrettyfy"] = function (data) {
    let msg = ""
    for (index in data.data.reverse()) {
        if(index == 5){
            break
        }
        msg += `${parseInt(index)+1}) Title : ${data.data[index].title}
Type : ${data.data[index].type}
Organizer : ${data.data[index].organizer}
Start Date : ${data.data[index].start_date}
End Date : ${data.data[index].end_date}
Website : ${data.data[index].website}
Venue : ${data.data[index].venue}\n`
    }
    return msg
}

module.exports["events"] = async (message, commands={}, api="", min_inputs=1) => {
    inputs = this.validateInput(message, commands, min_inputs);
    if(inputs !== false) {
        let country = inputs[1] ? inputs[1].toUpperCase() : "US";
        await fetch(this.create_url(api, `events?country_code=${country}&upcoming_events_only=true`)).then(resp => resp.json()).then(data => {
            if(data.count === 0){
                message.channel.send(this.replaceAuthor(message.author, commands["events"]["output_on_no_event"]).replace(/\<country_initial\>/g, country));
            }else {
                let userMsg = this.replaceAuthor(message.author, commands["events"]["output"]).replace(/\<events\>/g, this.eventPrettyfy(data)).replace(/\<country_initial\>/g, country);
                message.channel.send(userMsg)
            }
        }).catch(error => {
            console.log(error)
            message.channel.send(this.failedToFetchError(message.author))
        })
    }
}

module.exports["showInfo"] = async (message, commands={}, api="", min_inputs=2) => {
    const coinInput = this.validateCoin(message, commands, min_inputs);
    if(coinInput !== false) {
        const {inputs, coin} = coinInput;
        delete coinInput;
        await fetch(this.create_url(api, `coins/${coin.id}?tickers=false`)).then(resp => resp.json()).then(data => {
            if(!data.error){
                const market_data = data.market_data;
                
                let coin_info = '';

                if(inputs[0].includes("info")) {
                    coin_info = commands["info"]["output"]
                }else {
                    coin_info = commands["show"]["output"]
                }

                coin_info = this.replaceAuthor(
                        message.author, coin_info.replace(/\<coin_name\>/g, data.name)
                    ).replace(
                        /\<coin_symbol\>/g, coin.symbol
                    ).replace(
                        /\<current_price\>/g, market_data.current_price.usd ? market_data.current_price.usd : 0
                    ).replace(
                        /\<market_cap\>/g, market_data.market_cap.usd ? market_data.market_cap.usd : 0
                    ).replace(
                        /\<market_cap_rank\>/g, market_data.market_cap_rank ? market_data.market_cap_rank : 0
                    ).replace(
                        /\<total_volume\>/g, market_data.total_volume.usd ? market_data.total_volume.usd : 0
                    ).replace(
                        /\<total_supply\>/g, market_data.total_supply ? market_data.total_supply : 'Not Known/Unlimited'
                    ).replace(
                        /\<max_supply\>/g, market_data.max_supply ? market_data.max_supply : 'Not Known/Unlimited'
                    ).replace(
                        /\<circulating_supply\>/g, market_data.circulating_supply ? market_data.circulating_supply : 0
                    ).replace(
                        /\<24h_high\>/g, market_data.high_24h.usd ? market_data.high_24h.usd : 0
                    ).replace(
                        /\<24h_low\>/g, market_data.low_24h.usd ? market_data.low_24h.usd : 0
                    ).replace(
                        /\<change_in_24h\>/g, market_data.price_change_24h_in_currency.usd ? market_data.price_change_24h_in_currency.usd : 0
                    ).replace(
                        /\<precent_change_in_1h\>/g, market_data.price_change_percentage_1h_in_currency.usd ? market_data.price_change_percentage_1h_in_currency.usd : 0
                    ).replace(
                        /\<percent_change_in_24h\>/g, market_data.price_change_percentage_24h_in_currency.usd ? market_data.price_change_percentage_24h_in_currency.usd : 0
                    ).replace(
                        /\<percent_change_in_7d\>/g, market_data.price_change_percentage_7d_in_currency.usd ? market_data.price_change_percentage_7d_in_currency.usd : 0
                    ).replace(
                        /\<percent_change_in_30d\>/g, market_data.price_change_percentage_30d_in_currency.usd ? market_data.price_change_percentage_30d_in_currency.usd : 0
                    ).replace(
                        /\<percent_change_in_1y\>/g, market_data.price_change_percentage_1y_in_currency.usd ? market_data.price_change_percentage_1y_in_currency.usd : 0
                    ).replace(
                        /\<liquidity_score\>/g, data.liquidity_score ? data.liquidity_score : 0
                    ).replace(
                        /\<community_score\>/g, data.community_score ? data.community_score : 0
                    ).replace(
                        /\<change_in_24h_up_down\>/g, market_data.price_change_percentage_24h < 0 ? 'Down' : 'Up'
                    )
                
                message.channel.send(coin_info)
            }else {
                message.channel.send(this.failedToFetchError(message.author))
            }
        }).catch(error => {
            console.log(error)
            message.channel.send(this.failedToFetchError(message.author))
        })
    }
}