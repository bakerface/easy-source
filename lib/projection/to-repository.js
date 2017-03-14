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

var set = require('../set');
var mergeEventStores = require('../merge-event-stores');
var toClass = require('./to-class');

module.exports = function (projection) {
  var Projection = toClass(projection);

  function Repository(eventStores, projectionStore) {
    this.eventStores = eventStores;
    this.projectionStore = projectionStore;
  }

  Repository.prototype.withEventStores = function (eventStores) {
    return new Repository(eventStores, this.projectionStore);
  };

  Repository.prototype.withEventStore = function (name, eventStore) {
    var eventStores = set(this.eventStores, name, eventStore);
    return new Repository(eventStores, this.projectionStore);
  };

  Repository.prototype.withProjectionStore = function (projectionStore) {
    return new Repository(this.eventStore, projectionStore);
  };

  function store(stored, hydrated) {
    if (stored !== hydrated) {
      var snapshot = hydrated.toSnapshot();

      var promise = this.projectionStore.store(
        snapshot.revision,
        snapshot.version,
        snapshot.state
      );

      return promise.then(function () {
        return hydrated;
      });
    }

    return hydrated;
  }

  function hydrate(eventStream, projection) {
    return eventStream.next()
      .then(function (item) {
        if (item.event) {
          var next = projection.accept(item.name, item.event);
          return hydrate(eventStream, next);
        }

        return projection;
      });
  }

  function fetchAndStore(projection) {
    var snapshot = projection.toSnapshot();
    var eventStream = mergeEventStores(this.eventStores, snapshot.version);

    return hydrate.call(this, eventStream, projection)
      .then(store.bind(this, projection));
  }

  function toProjection(snapshot) {
    var projection = Projection.getDefault();

    if (snapshot) {
      projection = projection.fromSnapshot(snapshot);
    }

    return projection;
  }

  Repository.prototype.fetch = function () {
    return this.projectionStore.fetch(projection.revision)
      .then(toProjection.bind(this))
      .then(fetchAndStore.bind(this));
  };

  return Repository;
};
