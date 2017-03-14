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
var getOwnPropertyNames = require('../get-own-property-names');
var toAggregateRepository = require('../aggregate/to-repository');
var toProjectionRepository = require('../projection/to-repository');

function toTitleCase(text) {
  return text[0].toUpperCase() + text.slice(1);
}

function unique(item, index, array) {
  return array.indexOf(item) === index;
}

module.exports = function (aggregates, projections) {
  function toAggregateName(event) {
    return getOwnPropertyNames(aggregates)
      .filter(function (name) {
        return aggregates[name].events[event];
      })
      .shift();
  }

  function getProjectionDependencies(projection) {
    return getOwnPropertyNames(projection.events)
      .map(toAggregateName)
      .filter(unique);
  }

  function Domain(eventStores, aggregateStores, projectionStores) {
    this._eventStores = eventStores;
    this._aggregateStores = aggregateStores;
    this._projectionStores = projectionStores;
  }

  Domain.prototype.withEventStore = function (name, eventStore) {
    return new Domain(
      set(this._eventStores, name, eventStore),
      this._aggregateStores,
      this._projectionStores
    );
  };

  Domain.prototype.withAggregateStore = function (name, aggregateStore) {
    return new Domain(
      this._eventStores,
      set(this._aggregateStores, name, aggregateStore),
      this._projectionStores
    );
  };

  Domain.prototype.withProjectionStore = function (name, projectionStore) {
    return new Domain(
      this._eventStores,
      this._aggregateStores,
      set(this._projectionStores, name, projectionStore)
    );
  };

  getOwnPropertyNames(aggregates).forEach(function (name) {
    var aggregate = aggregates[name];
    var Repository = toAggregateRepository(aggregate);
    var withEventStore = 'with' + toTitleCase(name) + 'EventStore';
    var withAggregateStore = 'with' + toTitleCase(name) + 'AggregateStore';

    Domain.prototype[withEventStore] = function (eventStore) {
      return this.withEventStore(name, eventStore);
    };

    Domain.prototype[withAggregateStore] = function (aggregateStore) {
      return this.withAggregateStore(name, aggregateStore);
    };

    getOwnPropertyNames(aggregate.commands).forEach(function (command) {
      Domain.prototype[command] = function (id, params) {
        var repository = new Repository()
          .withEventStore(this._eventStores[name])
          .withAggregateStore(this._aggregateStores[name]);

        return repository.fetch(id)
          .then(function (aggregate) {
            return aggregate.process(command, params);
          })
          .then(function (aggregate) {
            return repository.save(aggregate);
          });
      };
    });
  });

  getOwnPropertyNames(projections).forEach(function (name) {
    var projection = projections[name];
    var Repository = toProjectionRepository(projection);
    var dependencies = getProjectionDependencies(projection);
    var withProjectionStore = 'with' + toTitleCase(name) + 'ProjectionStore';

    Domain.prototype[withProjectionStore] = function (projectionStore) {
      return this.withProjectionStore(name, projectionStore);
    };

    getOwnPropertyNames(projection.queries).forEach(function (query) {
      Domain.prototype[query] = function (params) {
        var repository = new Repository()
          .withProjectionStore(this._projectionStores[name]);

        for (var i = 0, ii = dependencies.length; i < ii; i++) {
          var dependency = dependencies[i];

          repository = repository.withEventStore(
            dependency,
            this._eventStores[dependency]
          );
        }

        return repository.fetch()
          .then(function (projection) {
            return projection.process(query, params);
          });
      };
    });
  });

  return Domain;
};
