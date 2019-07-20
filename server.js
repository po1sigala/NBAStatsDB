const cheerio = require("cheerio");
const logger = require("morgan");
const mongoose = require("mongoose");
const express = require("express");
const axios = require("axios");
const PORT = 3000 || process.env.PORT;
const db = require("./models");
const app = express();
// const databaseUrl = "NBA"
// const collections = ["plays", "players", "teams", "seasons"]
app.use(logger("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

mongoose.connect("mongodb://localhost/NBA", { useNewUrlParser: true });

app.get("/scrape", function(req, res) {
    console.log("scrapping");
    axios
        .get(
            "https://www.espn.com/nba-summer-league/playbyplay?gameId=401144602&league=nba-summer-las-vegas"
        )
        .then(function(response) {
            console.log("web....");
            const $ = cheerio.load(response.data);
            let a = [];
            let count = 0;
            let result = {};
            //determine the teams and matchup
            $(".mediaList").each(function(i, element) {
                //should get "teamAcronym vs otherAcronym videos"
                let matchup = $(element)
                    .children("h1")
                    .text()
                    .split(" ");
                result.homeTeam = matchup[0];
                result.awayTeam = matchup[2];
                result.matchup = matchup.slice(0, 2);
            });
            $(".accordion-content.collapse tr").each(function(i, element) {
                //create empty object that will become our new data row

                let event = $(element);
                let play = event.children(".game-details").text();
                //the name should be the first two words in the string
                let ballHandler = play.split(" ").slice(0, 2);
                //create key in the object called time and set it to the times stamp
                result.time = event.attr(".time-stamp").text();
                //create a key in the object called score and set it to the combined score
                result.score = event.attr(".combined-score").text();
                checkName(ballHandler, result);
                determinePlay(play);
                //set the date of the game
                //set the game matchup
            });
        });
});
function checkName(ballHandler, result) {
    if (ballHandler === result.homeTeam || ballHandler === result.awayTeam) {
        //in the case wherer no none is attributed bc its a live game end the search and dont plus into db
        return;
    }
}
function determinePlay(play) {
    //depending on what the play is make a different Mongo injection
    switch (play) {
        //for missed threes
        case /(\w*)misses|(\w*)three/g.test(play):
            let event = "miss";
            let type = "three";
            addToDb(event, type);

            break;
        //for made threes
        case /(\w*)makes|(\w*)three/g.test(play):
            let event = "make";
            let type = "three";
            addToDb(event, type);
            break;
        //for missed two jumpers
        //--------------------------------UPDATE THIS TO TELL THE DIFFERENCE BETWEEN JUMPERS AND DUNKS AND LAYUPS FOR A BETTER DB----------------------------
        case /(\w*)misses|(\w*)two|(\w*)dunk|(\w*)layup/g.test(play):
            let event = "miss";
            let type = "two";
            addToDb(event, type);
            break;
        //for made twos
        case /(\w*)makes|(\w*)two|(\w*)dunk|(\w*)layup/g.test(play):
            let event = "make";
            let type = "two";
            addToDb(event, type);
            break;
        case /turnover/g.test(play):
            let event = "TO";
            let type = "offense";
            addToDb(event, type);
            break;
        case /steal/g.test(play):
            count++;
            //if steals present take two indexes before and count as steal by that guy as well as turnover by the frist two indexes guy
            let event = "steal";
            let type = "defense";
            addToDb(event, type);
            console.log(play);
            // res.write(play);
            break;
        case /rebound/g.test(play):
            count++;
            //if offensive or team count as offensive else defensive
            console.log(play);
            // res.write(play);
            break;
        case /foul/g.test(play):
            count++;
            console.log(play);
            // res.write(play);
            break;
    }
    // if (play && time && score) {
    //     db.scrapedData.insert(
    //         {
    //             time: time,
    //             play: play,
    //             score: score
    //         },
    //         function(err, inserted) {
    //             if (err) {
    //                 console.log(err);
    //             } else {
    //                 console.log(inserted);
    //             }
    //         }
    //     );
    // }
}
function addToDb(event, type, player) {
    result.event = event;
    result.type = type;
    result.name = player;
    db.play.create(result);

    result.play = db.play.create(result);
}
app.listen(PORT, function() {
    console.log(`app listening on port ${PORT}`);
});
