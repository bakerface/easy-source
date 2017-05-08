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
var set = require('../set');
var getOwnPropertyNames = require('../get-own-property-names');

function toError(query, params, reason) {
  var type = query + 'Failed';

  var defaults = {
    type: type,
    reason: reason,
    at: Date.now()
  };

  return assign(defaults, params);
}

function resolve(value) {
  return value;
}

function reject(query, params, reason) {
  throw toError(query, params, reason);
}

module.exports = function (projection) {
  function Projection(state, version) {
    this._state = state;
    this._version = version;
  }

  Projection.getDefault = function () {
    return new Projection(projection.defaultState, { });
  };

  Projection.prototype.toSnapshot = function () {
    return {
      revision: projection.revision,
      version: this._version,
      state: this._state
    };
  };

  Projection.prototype.fromSnapshot = function (snapshot) {
    return this
      .withVersion(snapshot.version)
      .withState(snapshot.state);
  };

  Projection.prototype.withState = function (state) {
    return new Projection(
      state,
      this._version
    );
  };

  Projection.prototype.withVersion = function (version) {
    return new Projection(
      this._state,
      version
    );
  };

  Projection.prototype.withVersionFor = function (name, version) {
    var versions = set(this._version, name, version);
    return this.withVersion(versions);
  };

  Projection.prototype.accept = function (name, event) {
    var accept = projection.events[event.type];
    var version = event._commitId
    var state = this._state;

    if (typeof accept === 'function') {
      state = accept(state, event);
    }

    return this.withState(state).withVersionFor(name, version);
  };

  Projection.prototype.process = function (type, params) {
    var process = projection.queries[type];

    if (typeof process === 'function') {
      return process(
        this._state,
        params,
        resolve,
        reject.bind(this, type, params)
      );
    }

    return this;
  };

  getOwnPropertyNames(projection.queries)
    .forEach(function (query) {
      Projection.prototype[query] = function (params) {
        return this.process(query, params);
      };
    });

  return Projection;
};
