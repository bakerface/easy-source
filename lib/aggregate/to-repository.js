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

var toClass = require('./to-class');

module.exports = function (aggregate) {
  var Aggregate = toClass(aggregate);

  function Repository(eventStore, aggregateStore) {
    this.eventStore = eventStore;
    this.aggregateStore = aggregateStore;
  }

  Repository.prototype.withEventStore = function (eventStore) {
    return new Repository(eventStore, this.aggregateStore);
  };

  Repository.prototype.withAggregateStore = function (aggregateStore) {
    return new Repository(this.eventStore, aggregateStore);
  };

  function store(stored, hydrated) {
    if (stored !== hydrated) {
      var snapshot = hydrated.toSnapshot();

      var promise = this.aggregateStore.store(
        snapshot.id,
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

  function hydrate(eventStream, aggregate) {
    return eventStream.next()
      .then(function (event) {
        if (event) {
          return hydrate(eventStream, aggregate.accept(event));
        }

        return aggregate;
      });
  }

  function fetchAndStore(aggregate) {
    var snapshot = aggregate.toSnapshot();
    var eventStream = this.eventStore.fetch(snapshot.id, snapshot.version);

    return hydrate.call(this, eventStream, aggregate)
      .then(store.bind(this, aggregate));
  }

  function toAggregate(id, snapshot) {
    var aggregate = Aggregate.getDefault(id);

    if (snapshot) {
      aggregate = aggregate.fromSnapshot(snapshot);
    }

    return aggregate;
  }

  Repository.prototype.fetch = function (id) {
    return this.aggregateStore.fetch(id, aggregate.revision)
      .then(toAggregate.bind(this, id))
      .then(fetchAndStore.bind(this));
  };

  Repository.prototype.save = function (aggregate) {
    var commit = aggregate.toCommit();
    var error = aggregate.getRootError();

    if (error) {
      throw error;
    }

    if (commit.events.length > 0) {
      return this.eventStore.append(commit.id, commit.version, commit.events);
    }
  };

  return Repository;
};
