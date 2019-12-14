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
var request = require('request');
var parseXML = require('xml2js').parseString;

module.exports = NodeHelper.create({

	start: function() {
		this.started = false;
	},

	getData: function() {
		var self = this;

		request({
			url: self.config.apiBase + self.config.vigiEndpoint,
			method: 'GET',
		}, function (error, response, body) {
			if (!error && response.statusCode === 200) {
				parseXML(body, function (error, result) {
						let data = result.CV.DV;

						for (let i = 0; i < data.length; i++) {
							if (data[i].$.dep == self.config.department) {
								let risks = [];
								if(data[i].risque) {
									for (let j = 0; j < data[i].risque.length; j++) {
										risks.push(parseInt(data[i].risque[j].$.val));
									}
								}

								self.sendSocketNotification("DATA", JSON.stringify({
									"department": parseInt(data[i].$.dep),
									"level": parseInt(data[i].$.coul),
									"risks": risks
								}));
							}
						}
				});
			}
		});
	},

	socketNotificationReceived: function(notification, payload) {
		var self = this;
		if (notification === 'CONFIG' && self.started == false) {
			self.config = payload;
			self.sendSocketNotification("STARTED", true);
			self.getData();
			self.started = true;
		}
	}

});

