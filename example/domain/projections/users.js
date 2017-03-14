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

var set = require('../../../lib/set');

exports.revision = 0;

exports.defaultState = { };

exports.events = {
  userRegistered: function (state, event) {
    var userId = event.aggregateId;
    var username = event.username;

    return set(state, userId, {
      id: userId,
      username: username,
      projects: [],
      ideas: []
    });
  },

  ideaCreated: function (state, event) {
    var ideaId = event.aggregateId;
    var userId = event.userId;

    var ideas = state[userId].ideas.concat({
      id: ideaId,
      name: event.name,
      description: event.description
    });

    var user = set(state[userId], 'ideas', ideas);

    return set(state, userId, user);
  },

  projectCreated: function (state, event) {
    var projectId = event.aggregateId;
    var userId = event.userId;

    var projects = state[userId].projects.concat({
      id: projectId,
      name: event.name,
      description: event.description
    });

    var user = set(state[userId], 'projects', projects);

    return set(state, userId, user);
  }
};

exports.queries = {
  getProfile: function (state, query, resolve) {
    var profile = state[query.userId];
    return resolve(profile);
  }
};
