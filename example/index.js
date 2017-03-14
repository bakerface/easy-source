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

var Promise = require('bluebird');
var Example = require('./domain');
var EventStore = require('./external/event-stores/memory');
var AggregateStore = require('./external/aggregate-stores/memory');
var ProjectionStore = require('./external/projection-stores/memory');

function sleep() {
  return new Promise(function (resolve) {
    setTimeout(resolve, 1);
  });
}

var example = new Example()
  .withUserEventStore(new EventStore())
  .withUserAggregateStore(new AggregateStore())
  .withProjectEventStore(new EventStore())
  .withProjectAggregateStore(new AggregateStore())
  .withIdeaEventStore(new EventStore())
  .withIdeaAggregateStore(new AggregateStore())
  .withUsersProjectionStore(new ProjectionStore());

example.registerUser(1, { username: 'john' })
  .then(function () {
    return example.registerUser(2, { username: 'jane' });
  })
  .then(sleep)
  .then(function () {
    return example.createIdea(1, {
      userId: 1,
      name: 'Idea',
      description: 'Lorem ipsum'
    });
  })
  .then(function () {
    return example.createIdea(2, {
      userId: 2,
      name: 'Idea',
      description: 'Lorem ipsum'
    });
  })
  .then(function () {
    return example.createIdea(3, {
      userId: 1,
      name: 'Idea',
      description: 'Lorem ipsum'
    });
  })
  .then(function () {
    return example.createProject(1, {
      userId: 1,
      name: 'Project',
      description: 'Lorem ipsum'
    });
  })
  .then(function () {
    return example.createProject(2, {
      userId: 1,
      name: 'Project',
      description: 'Lorem ipsum'
    });
  })
  .then(function () {
    return example.createProject(3, {
      userId: 2,
      name: 'Project',
      description: 'Lorem ipsum'
    });
  })
  .then(function () {
    return example.getProfile({ userId: 1 });
  })
  .then(console.log)
  .catch(console.error);
