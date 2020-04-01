'use strict';

/* Magic Mirror
 * Module: MMM-VigilanceMeteoFrance
 *
 * Magic Mirror By Michael Teeuw https://magicmirror.builders
 * MIT Licensed.
 *
 * Module MMM-VigilanceMeteoFrance By Grena https://github.com/grenagit
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');
const fetch = require('node-fetch');
const parseXML = require('xml2js').parseString;

module.exports = NodeHelper.create({

	getData: function() {
		var self = this;

		fetch(self.config.apiBase + self.config.vigiEndpoint, { method: 'GET' })
		.then(function(response) {
			if (response.status === 200) {
				return response.text();
			} else {
				self.sendSocketNotification("ERROR", response.status);
			}
		})
		.then(function(body) {
			parseXML(body, function (error, result) {
				let data = result.CV.DV;
				let risks = [];
				let level = 1;

				for (let i = 0; i < data.length; i++) {
					if (data[i].$.dep == self.config.department || data[i].$.dep == (self.config.department + "10")) {
						if (data[i].risque) {
							for (let j = 0; j < data[i].risque.length; j++) {
								risks.push({"id": parseInt(data[i].risque[j].$.val), "level": parseInt(data[i].$.coul)});
								if (data[i].$.coul > level) {
									level = parseInt(data[i].$.coul);
								}
							}
						}
					}
				}

				risks.sort((a, b) => Number(b.level) - Number(a.level));

				self.sendSocketNotification("DATA", JSON.stringify({
					"department": self.config.department,
					"level": level,
					"risks": risks
				}));
			});
		})
		.catch(function(error) {
			console.log(error);
		});
	},

	socketNotificationReceived: function(notification, payload) {
		var self = this;
		if (notification === 'CONFIG') {
			self.config = payload;
			self.sendSocketNotification("STARTED", true);
			self.getData();
		}
	}

});

