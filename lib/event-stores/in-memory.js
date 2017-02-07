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

function clone(object) {
  return JSON.parse(JSON.stringify(object));
}

var Store = module.exports = function () {
  this._events = [];
};

Store.VersionConflictError = function () {
  Error.call(this);
  this.name = 'EventStoreVersionConflictError';
  this.message = 'An event with the specified version already exists';
  Error.captureStackTrace(this, this.constructor);
};

Store.prototype.fetch = function (options) {
  var events = this._events
    .filter(function (event) {
      return event.aggregateId === options.aggregateId;
    });

  return Promise.resolve(events.slice(options.version, options.version + 1));
};

var EVENT_ID_PAD = '00000000000000000000';

function toEventId(createdAt, index, aggregateId) {
  var microseconds = (createdAt * 1000) + index;

  var paddedMicroseconds = (EVENT_ID_PAD + microseconds)
    .slice(-EVENT_ID_PAD.length);

  return paddedMicroseconds + aggregateId;
}

Store.prototype.append = function (options) {
  var events = this._events
    .filter(function (event) {
      return event.aggregateId === options.aggregateId;
    });

  if (events.length !== options.version) {
    return Promise.reject(new Store.VersionConflictError());
  }

  var createdAt = Date.now();

  var committed = options.events
    .map(function (event, index) {
      var e = clone(event);

      e.eventId = toEventId(createdAt, index, options.aggregateId);
      e.createdAt = createdAt;
      e.aggregateId = options.aggregateId;

      return e;
    });

  this._events = this._events.concat(committed);
  return Promise.resolve();
};
