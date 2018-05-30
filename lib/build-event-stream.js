
function EventStream(events) {
  this._events = events;
};

function _extractEvents(res) {
  return res.events.map(e => {
    return Object.assign({}, e, {
      commitId: res.commitId,
      aggregateId: res.aggregateId,
    })
  })
}

EventStream.prototype = {
  next: function () {
    return Promise.resolve(this._events.shift());
  },
  events: function () {
    return Promise.resolve(this._events);
  },
};



module.exports = function (res) {
  var events = res.reduce(function(pre, cur) {
    return pre.concat(_extractEvents(cur));
  }, []);

  return new EventStream(events);
};
