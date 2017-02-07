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

var Repository = module.exports = function (options) {
  this._eventStore = options.eventStore;
  this._snapshotStore = options.snapshotStore;
  this._defaultState = options.defaultState;
  this._revision = options.revision;
  this._events = options.events;
};

function fetchSnapshot(aggregateId) {
  var defaultSnapshot = {
    aggregateId: aggregateId,
    version: 0,
    revision: this._revision,
    state: this._defaultState
  };

  return this._snapshotStore.fetch(aggregateId)
    .then(function (storedSnapshot) {
      return storedSnapshot || defaultSnapshot;
    });
}

function defaultEventHandler(state) {
  return state;
}

function accept(snapshot, event) {
  var handle = this._events[event.type] || defaultEventHandler;

  return {
    aggregateId: snapshot.aggregateId,
    version: snapshot.version + 1,
    revision: snapshot.revision,
    state: handle(snapshot.state, event)
  };
}

function hydrateOne(snapshot, events) {
  if (events.length === 0) {
    return snapshot;
  }

  var nextSnapshot = events.reduce(accept.bind(this), snapshot);
  return hydrate.call(this, nextSnapshot);
}

function hydrate(snapshot) {
  return this._eventStore.fetch(snapshot)
    .then(hydrateOne.bind(this, snapshot));
}

function snapshotStrategy(before, after) {
  if (before.version !== after.version) {
    return this._snapshotStore.store(after)
      .then(function () {
        return after;
      });
  }

  return after;
}

function hydrateAndStore(snapshot) {
  return hydrate.call(this, snapshot)
    .then(snapshotStrategy.bind(this, snapshot))
    .then(function (snapshot) {
      return snapshot.state;
    });
}

Repository.prototype.fetch = function (aggregateId) {
  return fetchSnapshot.call(this, aggregateId)
    .then(hydrateAndStore.bind(this));
};

Repository.prototype.save = function (aggregate) {
  return aggregate;
};
