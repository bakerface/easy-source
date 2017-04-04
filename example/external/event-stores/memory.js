/**
 * Copyright (c) 2017 Chris Baker <mail.chris.baker@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */

'use strict';

var Promise = require('bluebird');

function hasAggregateId(aggregateId) {
  return function (record) {
    return record.aggregateId === aggregateId;
  };
}

function serialize(aggregateId) {
  return function (event) {
    return {
      aggregateId: aggregateId,
      json: JSON.stringify(event)
    };
  };
}

function deserialize(record) {
  var event = JSON.parse(record.json);
  event.aggregateId = record.aggregateId;
  return event;
}

function EventStream(events) {
  this._events = events;
}

EventStream.prototype = {
  next: function () {
    return Promise.resolve(this._events.shift());
  }
};

function EventStore() {
  this._records = [];
}

EventStore.VersionConflictError = function () {
  this.name = 'EventStoreVersionConflictError';
  this.message = 'An event with the specified version already exists';
};

EventStore.prototype = {
  fetch: function (aggregateId, version) {
    var events = this._records
      .filter(hasAggregateId(aggregateId))
      .slice(version)
      .map(deserialize);

    return Promise.resolve(new EventStream(events));
  },

  scan: function (version) {
    var events = this._records
      .slice(version)
      .map(deserialize);

    return Promise.resolve(new EventStream(events));
  },

  append: function (aggregateId, version, events) {
    var expected = this._records
      .filter(hasAggregateId(aggregateId))
      .length;

    if (version !== expected) {
      return Promise.reject(new EventStore.VersionConflictError());
    }

    var records = events.map(serialize(aggregateId));
    this._records = this._records.concat(records);

    return Promise.resolve();
  }
};

module.exports = EventStore;
