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
var getOwnPropertyNames = require('./get-own-property-names');
var buildEventStream = require('./build-event-stream');

function EmptyEventStream() {

}

EmptyEventStream.prototype.next = function () {
  return Promise.resolve();
};

function BufferedEventStream(eventStream, name) {
  this._eventStream = eventStream;
  this._name = name;
}

function buffer(event) {
  this._pending = event;
  this._finished = typeof event === 'undefined';

  return {
    stream: this,
    name: this._name,
    event: event
  };
}

BufferedEventStream.prototype.peek = function () {
  if (this._finished) {
    return Promise.resolve({
      stream: this,
      name: this._name
    });
  }

  if (this._pending) {
    return Promise.resolve({
      stream: this,
      name: this._name,
      event: this._pending
    });
  }

  return this._eventStream.next()
    .then(buffer.bind(this));
};

function unbuffer(item) {
  this._pending = null;
  return item;
}

BufferedEventStream.prototype.next = function () {
  return this.peek()
    .then(unbuffer.bind(this));
};

function MergedEventStream(a, b) {
  this._a = a;
  this._b = b;
}

function pick(items) {
  var a = items.shift();
  var b = items.shift();

  if (typeof a.event === 'undefined') {
    return b;
  }

  if (typeof b.event === 'undefined') {
    return a;
  }

  if (a.event.at < b.event.at) {
    return a;
  }

  return b;
}

MergedEventStream.prototype.peek = function () {
  var promises = [
    this._a.peek(),
    this._b.peek()
  ];

  return Promise.all(promises).then(pick);
};

MergedEventStream.prototype.next = function () {
  return this.peek()
    .then(function (item) {
      return item.stream.next()
        .then(function () {
          return item;
        });
    });
};

module.exports = function (eventStores, versions) {
  var empty = new BufferedEventStream(new EmptyEventStream());
  var promises = getOwnPropertyNames(eventStores)
    .map(function (name) {
      var version = versions[name] || '0';
      return eventStores[name].scan(version)
        .then(buildEventStream)
        .then(function (eventStream) {
          return new BufferedEventStream(eventStream, name);
        })
    })
  
  return Promise.all(promises)
    .reduce(function (a, b) {
      return new MergedEventStream(a, b);
    }, empty);
};
