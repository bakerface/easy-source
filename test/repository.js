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

const assert = require('assert');
const EasySource = require('..');

const EVENTS_CREATE_JOHN = {
  aggregateId: 'john',
  version: 0,
  events: [
    {
      type: 'accountCreated',
      username: 'john',
      email: 'john@doe.com'
    },
    {
      type: 'profileEdited',
      name: 'John Doe'
    }
  ]
};

const EVENTS_DELETE_JOHN = {
  aggregateId: 'john',
  version: 2,
  events: [
    {
      type: 'accountDeactivated'
    },
    {
      type: 'accountDeleted'
    }
  ]
};

const EVENT_HANDLERS = {
  accountCreated: function (state, event) {
    state.username = event.username;
    state.emails.push(event.email);
    return state;
  },

  profileEdited: function (state, event) {
    state.name = event.name;
    return state;
  },

  accountDeleted: function (state) {
    state.isDeleted = true;
    return state;
  }
};

const COMMAND_HANDLERS = {
  createAccount: function (state, command) {
    return [
      {
        type: 'accountCreated',
        username: command.username,
        email: command.email
      },
      {
        type: 'profileEdited',
        name: command.name
      }
    ];
  }
};

describe('EasySource.Repository', function () {
  beforeEach(function () {
    this.eventStore = new EasySource.EventStores.InMemory();
    this.snapshotStore = new EasySource.SnapshotStores.InMemory();
    this.defaultState = { emails: [] };

    this.repo = new EasySource.Repository({
      revision: 0,
      eventStore: this.eventStore,
      snapshotStore: this.snapshotStore,
      defaultState: this.defaultState,
      events: EVENT_HANDLERS,
      commands: COMMAND_HANDLERS
    });
  });

  describe('#fetch(aggregateId)', function () {
    it('should fetch unknown aggregates', function () {
      return this.repo.fetch('john')
        .then(function (john) {
          var state = john.getState();
          assert.deepEqual(state.emails, []);
        });
    });

    it('should fetch new aggregates', function () {
      var repo = this.repo;

      return this.eventStore.append(EVENTS_CREATE_JOHN)
        .then(function () {
          return repo.fetch('john');
        })
        .then(function (john) {
          var state = john.getState();

          assert.deepEqual(state.username, 'john');
          assert.deepEqual(state.name, 'John Doe');
          assert.deepEqual(state.emails, [ 'john@doe.com' ]);
        });
    });

    it('should snapshot the state once up-to-date', function () {
      var repo = this.repo;
      var snapshotStore = this.snapshotStore;

      return this.eventStore.append(EVENTS_CREATE_JOHN)
        .then(function () {
          return repo.fetch('john');
        })
        .then(function () {
          return snapshotStore.fetch('john');
        })
        .then(function (snapshot) {
          assert.deepEqual(snapshot.version, 2);
          assert.deepEqual(snapshot.revision, 0);
          assert.deepEqual(snapshot.aggregateId, 'john');
          assert.deepEqual(snapshot.state.username, 'john');
          assert.deepEqual(snapshot.state.name, 'John Doe');
          assert.deepEqual(snapshot.state.emails, [ 'john@doe.com' ]);
        });
    });

    it('should fetch out-of-date aggregates', function () {
      var repo = this.repo;
      var eventStore = this.eventStore;

      return eventStore.append(EVENTS_CREATE_JOHN)
        .then(function () {
          return repo.fetch('john');
        })
        .then(function () {
          return eventStore.append(EVENTS_DELETE_JOHN);
        })
        .then(function () {
          return repo.fetch('john');
        })
        .then(function (john) {
          var state = john.getState();

          assert.deepEqual(state.username, 'john');
          assert.deepEqual(state.name, 'John Doe');
          assert.deepEqual(state.emails, [ 'john@doe.com' ]);
          assert.deepEqual(state.isDeleted, true);
        });
    });

    it('should fetch up-to-date aggregates', function () {
      var repo = this.repo;
      var eventStore = this.eventStore;

      return eventStore.append(EVENTS_CREATE_JOHN)
        .then(function () {
          return repo.fetch('john');
        })
        .then(function () {
          return repo.fetch('john');
        })
        .then(function (john) {
          var state = john.getState();

          assert.deepEqual(state.username, 'john');
          assert.deepEqual(state.name, 'John Doe');
          assert.deepEqual(state.emails, [ 'john@doe.com' ]);
        });
    });
  });

  describe('#save(aggregate)', function () {
    it('should ignore if there are no changes', function () {
      var repo = this.repo;

      return repo.fetch('john')
        .then(function (john) {
          return repo.save(john);
        });
    });

    it('should append the events to the store', function () {
      var repo = this.repo;

      return repo.fetch('john')
        .then(function (john) {
          john.createAccount({
            username: 'john',
            email: 'john@doe.com',
            name: 'John Doe'
          });

          return repo.save(john);
        })
        .then(function () {
          return repo.fetch('john');
        })
        .then(function (john) {
          var state = john.getState();

          assert.deepEqual(state.username, 'john');
          assert.deepEqual(state.name, 'John Doe');
          assert.deepEqual(state.emails, [ 'john@doe.com' ]);
        });
    });

    it('should handle version conflicts', function () {
      var repo = this.repo;

      return repo.fetch('john')
        .then(function (john) {
          john.createAccount({
            username: 'john',
            email: 'john@doe.com',
            name: 'John Doe'
          });

          return repo.save(john)
            .then(function () {
              return repo.save(john);
            });
        })
        .catch(function (err) {
          assert(err instanceof
            EasySource.EventStores.InMemory.VersionConflictError);
        });
    });
  });
});
