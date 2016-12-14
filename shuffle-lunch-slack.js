var rp = require('request-promise');
var _ = require('lodash');
var bluebird = require('bluebird');

var token = '';
var text = 'Welcome to shuffle lunch';

module.exports = function(context, done) {
  token = context.slackToken;
  shuffleUsers(done);
};

var shuffleUsers = bluebird.coroutine(function*(done) {
  try {
    var users = yield slackApi('users.list');
    var groups = _.chain(users.members)
      .filter({ deleted: false })
      .map('id')
      .shuffle()
      .chunk(5)
      .value();

    groups = redistributeUsers(groups);

    for (var group of groups) {
      var mpim = yield slackApi('mpim.open', {
        users: group.toString(),
      });

      yield slackApi('chat.postMessage', {
        channel: mpim.group.id,
        text,
        as_user: false,
      });
    }

  } catch(err) {
    return done(err);
  }

  done();
});

function redistributeUsers(groups) {
  if (groups.length <= 1) {
    return groups;
  }
  
  var lastGroup = groups[groups.length - 1];

  if (lastGroup.length <= 2) {
    for (var user of lastGroup) {
      groups[getRandomInt(0, groups.length - 1)].push(user);
    }

    if (groups.length > 1) {
      groups = groups.slice(0, -1);
    }
  }

  return groups;
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

function slackApi(endpoint, queryParams) {
  queryParams = _.assign({
    token,
  }, queryParams);

  return rp({
    uri: `https://slack.com/api/${endpoint}`,
    qs: queryParams,
    json: true,
  });
}
