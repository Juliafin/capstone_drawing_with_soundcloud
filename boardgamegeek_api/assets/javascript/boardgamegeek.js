// State object for API data
var BggData = {
  hotlist: [],
  mainData: [],
  singleSearch: {},
  singleResult: 0,
};


// Changes XML to JSON
function xmlToJson(xml) {

  // Create the return object
  var obj = {};

  if (xml.nodeType == 1) { // element
    // do attributes
    if (xml.attributes.length > 0) {
      obj["@attributes"] = {};
      for (var j = 0; j < xml.attributes.length; j++) {
        var attribute = xml.attributes.item(j);
        obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
      }
    }
  } else if (xml.nodeType == 3) { // text
    obj = xml.nodeValue;
  }

  // do children
  if (xml.hasChildNodes()) {
    for (var i = 0; i < xml.childNodes.length; i++) {
      var item = xml.childNodes.item(i);
      var nodeName = item.nodeName;
      if (typeof(obj[nodeName]) == "undefined") {
        obj[nodeName] = xmlToJson(item);
      } else {
        if (typeof(obj[nodeName].push) == "undefined") {
          var old = obj[nodeName];
          obj[nodeName] = [];
          obj[nodeName].push(old);
        }
        obj[nodeName].push(xmlToJson(item));
      }
    }
  }
  return obj;
}

// Enable CORS (bypass Bgg api CORS block)
// 'crossorigin.me'
// 'cors-anywhere.herokuapp.com'
(function() {
  var cors_api_host = 'cors-anywhere.herokuapp.com';
  var cors_api_url = 'https://' + cors_api_host + '/';
  var slice = [].slice;
  var origin = window.location.protocol + '//' + window.location.host;
  var open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function() {
    var args = slice.call(arguments);
    var targetOrigin = /^https?:\/\/([^\/]+)/i.exec(args[1]);
    if (targetOrigin && targetOrigin[0].toLowerCase() !== origin &&
      targetOrigin[1] !== cors_api_host) {
      args[1] = cors_api_url + args[1];
    }
    return open.apply(this, args);
  };
})();

// getting shallow data (name id, publisher)
// 1st api call to BGG returns hotlist
// 2nd api > shallow search of games using search term, triggering 3rd and 4th calls
// 3rd api > BGG (gameid) more indepth on those particular games
// 4th api > youtube (name) (+ "playthrough") > playthrough

var BOARDGAMEGEEK_SEARCH_URL = "https://boardgamegeek.com/xmlapi/search/";
var BOARDGAMEGEEK_GAMEID_URL = "https://boardgamegeek.com/xmlapi/boardgame/";
var BOARDGAMEGEEK_HOTLIST_URL = "https://boardgamegeek.com/xmlapi2/hot?type=boardgame";
// search and gameID not provided, returns hot list
// search provided, returns shallow search of games,
// game id provided, returns deep search of games
function getDataFromBGGApi(gameId, search) {

  // parameters for Boardgameapi, plus changes depending on search conditions
  var boardgamegeekSearchSetting = {
    url: '',
    data: {
      search: search || undefined,
      stats: ''
    },
    dataType: 'xml',
    type: 'GET',
  };

  // TODO breakout validation into separate function


  if ((!search) && (!gameId)) {

    boardgamegeekSearchSetting.url = BOARDGAMEGEEK_HOTLIST_URL;
    // console.log("Ajax: Hotlist");
  } else if (search !== undefined) {
    boardgamegeekSearchSetting.url = BOARDGAMEGEEK_SEARCH_URL;
    // console.log("Ajax: Bgg search")
  } else {
    boardgamegeekSearchSetting.url = BOARDGAMEGEEK_GAMEID_URL + gameId;
    // console.log('Ajax: Bgg gameid ', boardgamegeekSearchSetting);
    boardgamegeekSearchSetting.data.stats = '1';
  }
  return boardgamegeekSearchSetting;
  // $.ajax(boardgamegeekSearchSetting).then(function(){
  // console.log('This happens after the ajax call .then')
  // console.log(boardgamegeekSearchSetting.url);
  // });
}


var _ = undefined;

var YOUTUBE_BASE_URL = "https://www.googleapis.com/youtube/v3/search";

function getDataFromYoutubeApi(callback, index) {

  var youtubeSendSetting = {
    url: YOUTUBE_BASE_URL,
    data: {
      q: BggData.singleSearch.youtubeSearchterm ||
      BggData.mainData[index].youtubeSearchterm,
      part: 'snippet',
      key: 'AIzaSyCpcsrpsW5YrXga0kp0tg241mPPwhsxwvA',
      r: 'json',
      maxResults: 1,
      type: 'video',
      videoEmbeddable: 'true'
    },
    dataType: 'json',
    type: 'GET',
    success: callback
  };
  $.ajax(youtubeSendSetting);
}


// testing youtube api call
// getDataFromYoutubeApi(printData);


function appendYTdata(data) {
  if (data.items.length === 0) {
    // console.log("This video does not exist on youtube");
    return;
  }
  // console.log("youtube raw data", data.items);

  // remove 404 error
  $('.error_image_container').remove();

  // get youtube url from state and draw iframe
  var youtubeUrl = "https://www.youtube.com/embed/" + data.items[0].id.videoId;
  var iframe = `<iframe id="youtubevideo" width="420" height="315"
src="">
</iframe>`;

  $('.lightbox').append(iframe);
  // console.log("This is the youtube url: ", youtubeUrl)
  $('#youtubevideo').attr('src', youtubeUrl);

}


// testing ajax and conversion to JSON
function printData(data) {
  // console.log("Youtube data: " , data);
  var Bggrawdata = xmlToJson(data);
  // console.log("This is the raw json conversion: ", Bggrawdata);
}

function saveDataHotlist(data) {

  // convert to JSON
  var hotlist = xmlToJson(data);
  console.log(hotlist);

  hotlist.items.item.forEach(function(element, index) {
    // create keys
    var hotlistData = {};
    var hotlistRank = element['@attributes'].rank;
    var hotlistGameId = element['@attributes'].id;
    var hotlistGameName = element.name['@attributes'].value;
    var hotlistThumbnail = element.thumbnail['@attributes'].value;

    if ("yearpublished" in element) {
      hotlistData.hotlistYearPublished = element.yearpublished['@attributes'].value;
      // console.log(hotlistData.hotlistYearPublished);
    }


    // push keys to object
    hotlistData.hotlistRank = hotlistRank;
    hotlistData.hotlistGameId = hotlistGameId;
    hotlistData.hotlistGameName = hotlistGameName;
    hotlistData.hotlistThumbnail = hotlistThumbnail;
    // hotlistData.hotlistYearPublished = hotlistYearPublished;

    // push to global object
    BggData.hotlist[index] = hotlistData;

    // test keys
    // console.log(hotlistRank);
    // console.log(hotlistGameId);
    // console.log(hotlistGameName);
    // console.log(hotlistThumbnail);
    // console.log(hotlistYearPublished);

  });
  // console.log("This is the hotlist in state: ", BggData.hotlist);
}

// save data to State => BggData
function saveDataShallowSearch(data) {

  // Clear previous data
  BggData.length = 0;

  // convert from xml to JSON
  var Bggshallowdata = xmlToJson(data);
  // console.log("Bgg shallow data", Bggshallowdata);

  // error correction if the ajax data returned is bad (no results)
  if (!('boardgame' in Bggshallowdata.boardgames)) {
    // console.log("There are no search results!!");

    var errorhtml = `<div id="noresultserror">
		<p>There are zero results for your search. Please try again. </p></div>`;

    $('.background').append(errorhtml);

    // restore pointer events on submit
    $('#submitbutton').css("pointer-events", "auto");

    // remove loader
    $('.loadingcontainer').remove();

    return;


  } else if(Array.isArray(Bggshallowdata.boardgames.boardgame)) {
    // iterate array of objects
    BggData.mainData = Bggshallowdata.boardgames.boardgame.map(function(element, index) {
      var bgObj = {};

      // console.log(element['@attributes'].objectid);
      bgObj.gameId = element['@attributes'].objectid;
      bgObj.boardGameName = element.name['#text'];

      // if the year published doesn't exist, make the key N/A
      if ('yearpublished' in element) {
        bgObj.yearpublished = element.yearpublished['#text'];
      } else {
        bgObj.yearpublished = "N/A";
      }

      // console.log(BggData.gameId);

      // pushes the board game name as youtube search term into state
      bgObj.youtubeSearchterm = element.name['#text'] + " walkthrough";

      // console.log(bgObj);
      return bgObj;

    });
    // console.log("Bgg data, shallow search done", BggData);
    // console.log("Youtube search terms: ", BggData.youtubeSearchterms)
  } else {

    var bgObj = {};

    bgObj.gameId = Bggshallowdata.boardgames.boardgame['@attributes'].objectid;
    bgObj.boardGameName = Bggshallowdata.boardgames.boardgame.name['#text'];

    // if the year published doesn't exist, make the key N/A
    if ('yearpublished' in Bggshallowdata.boardgames.boardgame) {
      bgObj.yearpublished = Bggshallowdata.boardgames.boardgame.yearpublished['#text'];
    } else {
      bgObj.yearpublished = "N/A";
    }

    // console.log(BggData.gameId);

    // pushes the board game name as youtube search term into state
    bgObj.youtubeSearchterm = Bggshallowdata.boardgames.boardgame.name['#text'] + " walkthrough";

    // console.log(bgObj);
    // Pushes the data from the single result into the state
    BggData.mainData.push(bgObj);

    // console.log("Bggmain data after shallow search", BggData.mainData);
  }

}

// makes string of game ids from game ids at global object

function createGameIdString() {
  var gameString = '';
  var comma = ', ';
  BggData.mainData.forEach(function(elem, index) {
    if (index === BggData.length - 1) {
      gameString += elem.gameId;
    } else {
      var gameidstr = elem.gameId + comma;
      gameString += gameidstr;
    }
  });
  // console.log("Game id string: " + gameString);
  return gameString;
}


// 2nd api call to BGG api (deep search using game ids)
function saveDataDeepSearch(data) {
  // data is not cleared as it is being aggregated from the first api call
  // convert xml to json
  var Bggdeepdata = xmlToJson(data);
  // console.log("Raw deep data:", Bggdeepdata);

  // if the first key of the raw data is an array!
  if (Array.isArray(Bggdeepdata.boardgames.boardgame)) {
    // iterate deep data
    Bggdeepdata.boardgames.boardgame.forEach(function(element, index) {
      // console.log("element:", element)
      // define data keys

      // corrects if image doesn't exist
      if ('image' in element) {
        var image = element.image['#text'];
      }

      // correcting when players is zero
      if ((element.maxplayers != 0) && (element.minplayers != 0)) {
        var players = element.minplayers['#text'] + ' - ' + element.maxplayers['#text'];

      } else if (element.maxplayers === element.minplayers) {
        var players = element.maxplayers;

      } else {
        var players = "N/A";
      }

      // corrects playingtime if it doesn't exist
      if ('playingtime' in element) {
        var playingtime = element.playingtime['#text'] + ' minutes';

      } else {
        var playingtime = "N/A";
      }

      // corrects age if it doesn't exist
      if ('age' in element) {
        var age = element.age['#text'];

      } else {
        var age = "N/A";
      }

      // corrects description if it doesn't exist
      if (('description' in element) && (element.description['#text'] !== undefined)) {
        var description = element.description['#text'];

      } else {
        var description = "N/A";
      }

      // corrects publisher if it doesn't exist
      if ('boardgamepublisher' in element) {
        var boardgamepublisher = element.boardgamepublisher['#text'];

      } else {
        var boardgamepublisher = "N/A";
      }

      // corrects average if it doesn't exist
      if ('statistics.ratings.average' in element) {
        var boardgameAvgRating = element.statistics.ratings.average['#text'];
      } else {
        var boardgameAvgRating = "N/A";
      }

      // Inconsistent data handling for board game rank
      if (Array.isArray(element.statistics.ratings.ranks.rank)) {
        var boardgameRank = element.statistics.ratings.ranks.rank[0]['@attributes'].value;
        // console.log('full boardgame rank: ', boardgameRank);

      } else if (typeof(element.statistics.ratings.ranks.rank) === 'object') {
        var boardgameRank = element.statistics.ratings.ranks.rank['@attributes'].value;

      } else {
        var boardgameRank = 'Not Ranked';
      }

      // Inconsistent data handling of board game mechanics
      // element.boardgamemechanic will be mapped to an array (which along with other keys will return into an object)
      // console.log(element, element.boardgamemechanic, element.boardgamemechanic.map)
      if (Array.isArray(element.boardgamemechanic)) {
        var boardgamemechanics = element.boardgamemechanic.map(function(elem) {
          // console.log('elem is an array, and this is the mechanic: ' + elem['#text'])
          return elem['#text'];
        });

      } else if ((typeof(element.boardgamemechanic) === 'object') && (element.boardgamemechanic !== null)) {
        //  object keys, iterate over keys, send into array
        var boardgamemechanics = element.boardgamemechanic['#text'];
        // console.log('elem is an object, and this is the mechanic: ' + boardgamemechanics);

      } else if (!element.boardgamemechanic) {
        var boardgamemechanics = 'N/A';
      }

      // Corrections on description and playing time
      if (description === "This page does not exist. You can edit this page to create it.") {
        description = "This item does not have a description.";
      }

      if (playingtime === "0 minutes") {
        playingtime = "N/A";
      }


      // Corrections on board game family
      if (Array.isArray(element.boardgamefamily)) {
        var boardgamefamily = element.boardgamefamily[0]['#text'];

      } else if (typeof(element.boardgamefamily) === 'object') {
        var boardgamefamily = element.boardgamefamily['#text'];

      } else {
        var boardgamefamily = "N/A";
      }

      // Corrections for board game Awards
      if (Array.isArray(element.boardgamehonor)) {
        var boardgameawards = element.boardgamehonor.map(function(element) {
          return element['#text'];
        });

      } else if (typeof(element.boardgamehonor) === 'object') {
        var boardgameawards = element.boardgamehonor['#text'];

      } else {
        var boardgameawards = "N/A";
      }


      // console.logs to test keys
      // console.log("image: " + image);
      // console.log("players: " + players);
      // console.log("playing time: " + playingtime);
      // console.log("age: " + age);
      // console.log("board game publisher: " + boardgamepublisher);
      // console.log("description: " + description);
      // console.log("board game rank: " + boardgameRank);
      // console.log("board game mechanics: " + boardgamemechanics)
      // console.log("board game avg rating: " + boardgameAvgRating);

      // write keys to state
      BggData.mainData[index].boardgameawards = boardgameawards;
      BggData.mainData[index].boardgamefamily = boardgamefamily;
      BggData.mainData[index].boardGameImage = image;
      BggData.mainData[index].players = players;
      BggData.mainData[index].playingTime = playingtime;
      BggData.mainData[index].age = age;
      BggData.mainData[index].boardgamepublisher = boardgamepublisher;
      BggData.mainData[index].description = description;
      BggData.mainData[index].boardgameAvgRating = boardgameAvgRating;
      BggData.mainData[index].boardgamemechanics = boardgamemechanics;
      BggData.mainData[index].boardgameRank = boardgameRank;


    }); //ends forEach function (iterating boardgame.boardgames)

    // console.log("Bgg main data written: ", BggData.mainData);
    // console.log("Bgg state object", BggData);


  } else if ((typeof(Bggdeepdata.boardgames.boardgame) === 'object') && (Bggdeepdata.boardgames.boardgame !== null)) {

    // console.log(Bggdeepdata);

    // top layer equivalent to "element" when boardgames.boardgame is an array
    var element = Bggdeepdata.boardgames.boardgame;

    // corrects if image doesn't exist
    if ('image' in element) {
      var image = element.image['#text'];
    }

    // correcting when players is zero
    if ((element.maxplayers != 0) && (element.minplayers != 0)) {
      var players = element.minplayers['#text'] + ' - ' + element.maxplayers['#text'];

    } else if (element.maxplayers === element.minplayers) {
      var players = element.maxplayers;

    } else {
      var players = "N/A";
    }

    // Corrects playtime when it doesn't exist
    if ('playtime' in element) {
      var playingtime = element.playingtime['#text'] + ' minutes';

    } else {
      var playingtime = "N/A";
    }

    // Corrects age when it doesn't exist
    if ('age' in element) {
      var age = element.age['#text'];

    } else {
      var age = "N/A";
    }

    // Corrects description when it doesn't exist
    if (('description' in element) && (element.description['#text'] !== undefined)) {
      var description = element.description['#text'];

    } else {
      var description = "N/A";
    }

    // Corrects board game publisher when it doesn't exist
    if ('boardgamepublisher' in element) {
      var boardgamepublisher = element.boardgamepublisher['#text'];

    } else {
      var boardgamepublisher = "N/A";
    }

    if ('statistics.ratings.average' in element) {
      var boardgameAvgRating = element.statistics.ratings.average['#text'];

    } else {
      var boardgameAvgRating = "N/A";
    }

    // Inconsistent data handling for board game rank
    if (Array.isArray(element.statistics.ratings.ranks.rank)) {
      var boardgameRank = element.statistics.ratings.ranks.rank[0]['@attributes'].value;
      // console.log('full boardgame rank: ', boardgameRank);

    } else if (typeof(element.statistics.ratings.ranks.rank) === 'object') {
      var boardgameRank = element.statistics.ratings.ranks.rank['@attributes'].value;

    } else {
      var boardgameRank = 'Not Ranked';
    }

    // Inconsistent data handling of board game mechanics
    // element.boardgamemechanic will be mapped to an array (which along with other keys will return into an object)
    // console.log(element, element.boardgamemechanic, element.boardgamemechanic.map)
    if (Array.isArray(element.boardgamemechanic)) {
      var boardgamemechanics = element.boardgamemechanic.map(function(elem) {
        // console.log('elem is an array, and this is the mechanic: ' + elem['#text'])
        return elem['#text'];
      });
    } else if ((typeof(element.boardgamemechanic) === 'object') && (element.boardgamemechanic !== null)) {
      //  object keys, iterate over keys, send into array
      var boardgamemechanics = element.boardgamemechanic['#text'];
      // console.log('elem is an object, and this is the mechanic: ' + boardgamemechanics);
    } else if (!element.boardgamemechanic) {
      var boardgamemechanics = 'N/A';
    }

    // Corrections on description and playing time
    if (description === "This page does not exist. You can edit this page to create it.") {
      description = "This item does not have a description.";
    }
    if (playingtime === "0 minutes") {
      playingtime = "N/A";
    }

    // Corrections on board game family
    if (Array.isArray(element.boardgamefamily)) {
      var boardgamefamily = element.boardgamefamily[0]['#text'];

    } else if (typeof(element.boardgamefamily) === 'object') {
      var boardgamefamily = element.boardgamefamily['#text'];

    } else {
      var boardgamefamily = "N/A";
    }

    // Corrections for board game Awards
    if (Array.isArray(element.boardgamehonor)) {
      var boardgameawards = element.boardgamehonor.map(function(element) {
        return element['#text'];
      });

    } else if (typeof(element.boardgamehonor) === 'object') {
      var boardgameawards = element.boardgamehonor['#text'];

    } else {
      var boardgameawards = "N/A";
    }

    // Year published (not grabbed from shallow search in single branch)
    if ('yearpublished' in element) {
      var yearpublished = element.yearpublished['#text'];
    } else {
      var yearpublished = "N/A";
    }

    //Grab boardgame name (always should exist!)
    if (Array.isArray(element.name)) {
      var boardgameName = element.name[0]['#text'];
    } else {
      var boardgameName = element.name['#text'];
    }


    // console.logs to test keys
    // console.log("image: " + image);
    // console.log("players: " + players);
    // console.log("playing time: " + playingtime);
    // console.log("age: " + age);
    // console.log("board game publisher: " + boardgamepublisher);
    // console.log("description: " + description);
    // console.log("board game rank: " + boardgameRank);
    // console.log("board game mechanics: " + boardgamemechanics)
    // console.log("board game avg rating: " + boardgameAvgRating);
    // console.log("boardgame awards: " + boardgameawards);
    // console.log("board game name:" + boardgameName);
    // This branch activates normally on hotlist deep queries

    // write youtubeSearchterm based on the game name
    var youtubeSearchterm = boardgameName + " walkthrough";

    // var gameid = Bggdeepdata.boardgames.boardgame['@attributes'].objectid;



    BggData.singleSearch.boardgameawards = boardgameawards;
    BggData.singleSearch.boardgamefamily = boardgamefamily;
    BggData.singleSearch.boardgameImage = image;
    BggData.singleSearch.players = players;
    BggData.singleSearch.playingTime = playingtime;
    BggData.singleSearch.age = age;
    BggData.singleSearch.boardgamepublisher = boardgamepublisher;
    BggData.singleSearch.description = description;
    BggData.singleSearch.boardgameAvgRating = boardgameAvgRating;
    BggData.singleSearch.boardgamemechanics = boardgamemechanics;
    BggData.singleSearch.boardgameRank = boardgameRank;
    BggData.singleSearch.boardgameName = boardgameName;
    BggData.singleSearch.yearpublished = yearpublished;
    BggData.singleSearch.youtubeSearchterm = youtubeSearchterm;


  } // closes main else if
  // console.log("This is the bggdeepdata", Bggdeepdata);
  // console.log("This is the BggData", BggData);

} // closes deep search


//  Collects board game from form submit
function getSearchTerm() {

  $('#boardgamesearch').submit(function(event) {

    event.preventDefault();

    var boardgamesearchterm = $('#boardgameterm').val();
    // console.log(boardgamesearchterm);

    // remove any previous zero reults errors
    $('#noresultserror').remove();

    // load the loading gif
    renderLoader();

    // var gameIDs = '';
    var _;
    $.ajax(getDataFromBGGApi(_, boardgamesearchterm)).then(function(response) {

      saveDataShallowSearch(response);

      var gameIDs = createGameIdString();

      $.ajax(getDataFromBGGApi(gameIDs)).then(function(response) {

        saveDataDeepSearch(response);

        renderSearchHtml();
      }); // closes first then
    }); // closes second then

  }); // closes submit listener
} // closes function


getSearchTerm();


function renderSearchHtml() {

  // clear existing html

  $('section#searchresults').empty();

  BggData.mainData.forEach(function(element, index) {

    // create the html element from state
    var html =
      `<article class="hidden boardgame" id="index${index}" gameid="${element.gameId}">
			<h2 class="boardgamename">${element.boardGameName}</h2>
			<div class="boardgameimage" id="imageindex${index}">
				<img class= "imagethumbnail" src="${element.boardGameImage}" alt="${element.boardGameName}">
			</div>
			<div class="playersandplaytime">
				<ul>
					<li>Playing time: ${element.playingTime}</li>
					<li>Number of players: ${element.players}</li>
				</ul>
			</div>
		</article>`;

    // append main element to DOM
    $('#searchresults').append(html);

    // add even and odd classes to control image floats in html
    if (index % 2 === 0) {
      var evenSelector = "#imageindex" + index;
      $(evenSelector).addClass('even');
    } else {
      var oddSelector = "#imageindex" + index;
      $(oddSelector).addClass('odd');
    }

    // With a delay, reveal each element
    setTimeout(function() {

      var showElementSelector = "#index" + index;
      $(showElementSelector).removeClass('hidden');
    }, 50); // closes setTimeout

  }); // ends main forEach

  // restore pointer events on submit
  $('#submitbutton').css("pointer-events", "auto");

  // remove loader
  $('.loadingcontainer').remove();

  // scroll to results
  $('html, body').animate({
    scrollTop: $('#searchresults').offset().top
  }, 1000);

  // starts listener listening for clicks on articles
  boardgameArticleListener();

} // ends the render function


function renderLoader() {

  var loaderhtml = `<div class=loadingcontainer>
					<img class="loading" src="assets/images/ajax-loader.gif" alt="">
					</div>`;

  $('body').prepend(loaderhtml);

  // disable submit clicks while loading
  $('#submitbutton').css("pointer-events", "none");
}

function boardgameArticleListener() {

  $('.boardgame').click(function(event) {

    event.preventDefault();

    // get the game id from element clicked
    var gameid = $(this).attr('gameid');
    // console.log("The game id clicked is: " + gameid);

    // find index of currently clicked gameid


    var gameidIndex = BggData.mainData.map(function(element, index) {
      if (gameid == element.gameId) {
        return index;
      } else {
        var emptystring = '';
        return emptystring;
      }

    }).join().replace(/,+/g, '').replace(/\s+/g, '');

    // console.log("This is the index matching the gameid: ", gameidIndex);
    // console.log(typeof(gameidIndex));



    renderAndDisplayFullBoardgame(gameidIndex);


  }); // ends click event listener

}


function renderAndDisplayFullBoardgame(index = 0) {

  // remove any previous lightbox
  $('.lightbox').remove();

  // If keys exist in the singleSearch (hotlist clicked), get keys from there
  // OR get keys from mainData state at the index matching gameid

  if ( 'boardgameImage' in BggData.singleSearch) {
    var image = BggData.singleSearch.boardgameImage;
  } else {
    var image = BggData.mainData[index].boardGameImage;
  }

  if ('boardgameAvgRating' in BggData.singleSearch) {
    var averagerating = BggData.singleSearch.boardgameAvgRating;
  } else {
    var averagerating = BggData.mainData[index].boardgameAvgRating;
  }

  if ('boardgameRank' in BggData.singleSearch) {
    var rank = BggData.singleSearch.boardgameRank;
  } else {
    var rank = BggData.mainData[index].boardgameRank;
  }

  if ('boardgameName' in BggData.singleSearch) {
    var gamename = BggData.singleSearch.boardgameName;
  } else {
    var gamename = BggData.mainData[index].boardGameName;
  }

  if ('boardgamepublisher' in BggData.singleSearch) {
    var gamepublisher = BggData.singleSearch.boardgamepublisher;
  } else {
    var gamepublisher = BggData.mainData[index].boardgamepublisher;
  }

  if ('description' in BggData.singleSearch) {
    var description = BggData.singleSearch.description;
  } else {
    var description = BggData.mainData[index].description;
  }

  if ('players' in BggData.singleSearch) {
    var players = BggData.singleSearch.players;
  } else {
    var players = BggData.mainData[index].players;
  }

  if ('playingTime' in BggData.singleSearch) {
    var playingTime = BggData.singleSearch.playingTime;
  } else {
    var playingTime = BggData.mainData[index].playingTime;
  }


  if ('yearpublished' in BggData.singleSearch) {
    var yearpublished = BggData.singleSearch.yearpublished;
  } else {
    var yearpublished = BggData.mainData[index].yearpublished;
  }

  if ('boardgamefamily' in BggData.singleSearch) {
    var boardgamefamily = BggData.singleSearch.boardgamefamily;
  } else {
    var boardgamefamily = BggData.mainData[index].boardgamefamily;
  }

  // If the key 'boardgamemechanics' exists in the JSON (as an object),
  // Apply one set of conversions.
  // If not, treat the key as an array.
  if ('boardgamemechanics' in BggData.singleSearch) {
    if (Array.isArray(BggData.singleSearch.boardgamemechanics)) {
      var boardgamemechanicshtml = BggData.singleSearch.boardgamemechanics.map(function(element) {
        return `<li>${element}</li>`;
      }).join().replace(/,/g, '');

    } else if (!('boardgamemechanics' in BggData.singleSearch)) {
      return;

    } else {
      var boardgamemechanicshtml = BggData.singleSearch.boardgamemechanics;

    }
  } else {
    // convert board game mechanics to a list
    if (Array.isArray(BggData.mainData[index].boardgamemechanics)) {
      var boardgamemechanicshtml = BggData.mainData[index].boardgamemechanics.map(function(element) {
        return `<li>${element}</li>`;
      }).join().replace(/,/g, '');

    } else if (!('boardgamemechanics' in BggData.mainData[index])) {
      return;

    } else {
      var boardgamemechanicshtml = BggData.mainData[index].boardgamemechanics;
    }

  }

  // console.log(boardgamemechanicshtml);

if ('boardgameawards' in BggData.singleSearch) {
  // convert board game awards to a list
  if (Array.isArray(BggData.singleSearch.boardgameawards)) {
    var boardgameawardshtml = BggData.singleSearch.boardgameawards.map(function(element) {
      return `<li>${element}</li>`;
    }).join().replace(/,/g, '');

  } else if (!('boardgameawards' in BggData.singleSearch)) {
    return;

  } else {
    var boardgameawardshtml = BggData.singleSearch.boardgameawards;
  }

} else {
  // convert board game awards to a list
  if (Array.isArray(BggData.mainData[index].boardgameawards)) {
    var boardgameawardshtml = BggData.mainData[index].boardgameawards.map(function(element) {
      return `<li>${element}</li>`;
    }).join().replace(/,/g, '');

  } else if (!('boardgameawards' in BggData.mainData[index])) {
    return;

  } else {
    var boardgameawardshtml = BggData.mainData[index].boardgameawards;
  }

}


  var gameLightboxHtml = `

		<div class="lightbox hidden">
        <button class="backbutton" type="button" name="button">Back</button>
		    <h2 class="boardgamenameLB">${gamename}</h2>
		    <div class="boardgameimageLB">
		        <img class="imagethumbnailLB" src="${image}" alt="${gamename}">
		    </div>
		    <div class="statsLB">Game Stats
		        <ul>
		            <li>Playing time: ${playingTime}</li>
		            <li>Number of players: ${players}</li>
		            <li>Game publisher: ${gamepublisher}</li>
		            <li>Year Published: ${yearpublished}</li>
		            <li>Rank: ${rank}</li>
		            <li>Average player rating: ${averagerating}</li>
								<li>Board game family: ${boardgamefamily}</li>
		        </ul>
		    </div>
		    <div class="description">
		        <h3>Description: </h3>
		        <p>${description}</p>
		    </div>
		    <div class="boardgamemechanicsLB">
		        <ul id="boardgamemechanics${index}" class="boardgamemechanics">
		            <p>Board game mechanics:</p>${boardgamemechanicshtml}
		        </ul>
		    </div>
				<div class="boardgameawardsLB">
		        <ul id="boardgameawards${index}" class="boardgameawards">
		            <p>Board game awards: </p>${boardgameawardshtml}
		        </ul>
		    </div>
        <div class="error_image_container">
          <img class="errorimage" src="assets/images/404error.jpg" alt="404error">
        </div>
		</div>
		`;


  $('body').prepend(gameLightboxHtml);

  // Stop scroll on main window
  $('html, body').css('overflow', 'hidden');

  // hide main body but not canvas keeps mouse position in the same place (instead of display:none)
  $('.background, #boardgamesearch, #searchresults, .hotlist, h1.hotlistheader, .hotlistcontainer').css('opacity', 0);

  // disable submit clicks and clicks on additional elements
  $('#submitbutton, article').css("pointer-events", "none");

  // listener for the backbutton
  backbuttonListener();

  // fade the lightbox in (default 0 opacity)
  $('.lightbox').fadeIn();

  getDataFromYoutubeApi(appendYTdata, index);

} // end renderAndDisplayFullBoardgame


function backbuttonListener() {

  $('.backbutton').click(function(event) {
    event.preventDefault();

    // Stop video from playing by removing iframe
    $('#youtubevideo').remove();

    // Re-allow click events on the main page
    $('#submitbutton, article').css("pointer-events", "auto");

    // Re-Allow scrolling on the body
    $('html, body').css('overflow', 'auto');

    // Show main body again
    $('.background, #boardgamesearch, #searchresults, .hotlist, h1.hotlistheader, .hotlistcontainer').css('opacity', 1);

    // clear state for singleSearch
    BggData.singleSearch = {};

    // fade out lightbox
    $('.lightbox').fadeOut(300);

  });
}

function renderAndDisplayHotlist() {
  $.ajax(getDataFromBGGApi()).then(function(response) {
    saveDataHotlist(response);
    // console.log("Hotlist data in state after save: ", BggData.hotlist);

    BggData.hotlist.forEach(function(element, index) {

      // get keys from state
      var hotlistGameId = element.hotlistGameId;
      var hotlistGameName = element.hotlistGameName;
      var hotlistRank = element.hotlistRank;
      var hotlistImage = element.hotlistThumbnail;

      if ('hotlistYearPublished' in element) {
        var hotlistYearPublished = element.hotlistYearPublished;

      } else {
        var hotlistYearPublished = "N/A";

      }
      var html =

        `
			<article class="hotlist" id="index${index}" gameid="${hotlistGameId}">
				<h2 class="boardgamename">${hotlistGameName}</h2>
				<div class="boardgameimage hotlistimage" id="imageindex${index}">
					<img class= "imagethumbnail" id= "innerimageindex${index}" src="${hotlistImage}" alt="${hotlistGameName}">
				</div>
				<div class="rankandyearpublished">
					<ul>
						<li>Hotlist Rank: ${hotlistRank}</li>
						<li>Year Published: ${hotlistYearPublished}</li>
					</ul>
				</div>
			</article>`;

      // console.log(html);

      // append to DOM
      $('.hotlistcontainer').append(html);

      if (index % 2 === 0) {
        var evenSelector1 = "#imageindex" + index;
        var evenSelector2 = "#innerimageindex" + index;
        $(evenSelector1).addClass('even');
        $(evenSelector2).addClass('even');
      } else {
        var oddSelector1 = "#imageindex" + index;
        var oddSelector2 = "#innerimageindex" + index;
        $(oddSelector1).addClass('odd');
        $(oddSelector2).addClass('odd');
      }

    });

    // listens for clicks on the hotlist (to display lightbox)
    hotlistListen();

    // console.log(hotlistHtml);
  }); // closes then / ajax

}

// Displays hotlist on load
renderAndDisplayHotlist();


function hotlistListen() {

  $('.hotlist').click(function(event) {

    event.preventDefault();

    // get the game id from element clicked
    var gameid = $(this).attr('gameid');
    // console.log("The game id clicked is: " + gameid);

    $.ajax(getDataFromBGGApi(gameid)).then(function(response) {

      saveDataDeepSearch(response);
      renderAndDisplayFullBoardgame();

      // TODO rewrite deepsearch specifically for

    });

  });

}

// TODO

// update to promises for error correction?
