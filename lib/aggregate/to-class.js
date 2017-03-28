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

var assign = require('../assign');
var getOwnPropertyNames = require('../get-own-property-names');

function toEvent(command, params, type) {
  var defaults = {
    type: type,
    at: Date.now()
  };

  return assign(defaults, params);
}

function toError(command, params, reason) {
  var type = command + 'Failed';

  var defaults = {
    type: type,
    reason: reason,
    at: Date.now()
  };

  return assign(defaults, params);
}

module.exports = function (aggregate) {
  function Aggregate(id, state, version, events, errors) {
    this._id = id;
    this._state = state;
    this._version = version;
    this._events = events;
    this._errors = errors;
  }

  Aggregate.getDefault = function (id) {
    return new Aggregate(id, aggregate.defaultState, 0, [], []);
  };

  Aggregate.prototype.getRootError = function () {
    return this._errors[0];
  };

  Aggregate.prototype.toCommit = function () {
    return {
      id: this._id,
      version: this._version - this._events.length,
      events: this._events
    };
  };

  Aggregate.prototype.toSnapshot = function () {
    return {
      id: this._id,
      revision: aggregate.revision,
      version: this._version,
      state: this._state
    };
  };

  Aggregate.prototype.fromSnapshot = function (snapshot) {
    return this
      .withId(snapshot.id)
      .withVersion(snapshot.version)
      .withState(snapshot.state);
  };

  Aggregate.prototype.withState = function (state) {
    return new Aggregate(
      this._id,
      state,
      this._version,
      this._events,
      this._errors
    );
  };

  Aggregate.prototype.withVersion = function (version) {
    return new Aggregate(
      this._id,
      this._state,
      version,
      this._events,
      this._errors
    );
  };

  Aggregate.prototype.withEvent = function (event) {
    return new Aggregate(
      this._id,
      this._state,
      this._version,
      this._events.concat(event),
      this._errors
    );
  };

  Aggregate.prototype.withError = function (error) {
    return new Aggregate(
      this._id,
      this._state,
      this._version,
      this._events,
      this._errors.concat(error)
    );
  };

  Aggregate.prototype.accept = function (event) {
    var accept = aggregate.events[event.type];
    var version = this._version + 1;
    var state = this._state;

    if (typeof accept === 'function') {
      state = accept(state, event);
    }

    return this.withState(state).withVersion(version);
  };

  function resolve(command, params, type) {
    var event = toEvent(command, params, type);
    return this.withEvent(event).accept(event);
  }

  function reject(command, params, type) {
    var error = toError(command, params, type);
    return this.withError(error);
  }

  Aggregate.prototype.process = function (type, params) {
    var process = aggregate.commands[type];

    if (typeof process === 'function') {
      return process(
        this._state,
        params,
        resolve.bind(this, type, params),
        reject.bind(this, type, params)
      );
    }

    return this;
  };

  getOwnPropertyNames(aggregate.commands)
    .forEach(function (command) {
      Aggregate.prototype[command] = function (params) {
        return this.process(command, params);
      };
    });

  return Aggregate;
};
