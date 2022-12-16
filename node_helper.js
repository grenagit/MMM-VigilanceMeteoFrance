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
const axios = require('axios');

module.exports = NodeHelper.create({

	getData: function() {
		var self = this;

		// Get Oauth2 token
		let apiTokenBase64 = Buffer.from(self.config.apiConsumerKey + ':' + self.config.apiConsumerSecret, 'utf8').toString('base64');

		axios({
			url: self.config.oauthEndpoint,
			data: {'grant_type': 'client_credentials'},
			headers: {
				'Authorization': 'Basic ' + apiTokenBase64,
				'Content-Type': 'application/x-www-form-urlencoded',
				'Accept': 'application/json'
			},
			method: 'post'
		})
		.then(function(response) {
			if(response.status == 200 && response.data) {
				// Get vigilance data
				axios({
					url: self.config.vigiEndpoint, 
					headers: {'Authorization': 'Bearer ' + response.data.access_token},
					method: 'get'
				})
				.then(function(response) {
					if(response.status == 200 && response.data) {
						self.formatData(response.data);
					} else {
						self.sendSocketNotification("ERROR", 'MeteoFrance Vigilance error: ' + response.statusText);
					}
				})
				.catch(function(error) {
					self.sendSocketNotification("ERROR", 'MeteoFrance Vigilance error: ' + error.message);
				});
			} else {
				self.sendSocketNotification("ERROR", 'MeteoFrance Oauth2 error: ' + response.statusText);
			}
		})
		.catch(function(error) {
			self.sendSocketNotification("ERROR", 'MeteoFrance Oauth2 error: ' + error.message);
		});
	},

	formatData: function(data) { 
		var self = this;

		let departmentDataJ = data.product.periods[0].timelaps.domain_ids.filter(item => item.domain_id == self.config.department)[0].phenomenon_items;
		let risks = [];
		let level = 1;

		for(let i = 0; i < departmentDataJ.length; i++) {
			if(!self.config.excludedRisks.includes(parseInt(departmentDataJ[i].phenomenon_id)) && departmentDataJ[i].phenomenon_max_color_id > 1) {
				risks.push({
					"id": parseInt(departmentDataJ[i].phenomenon_id),
					"level": departmentDataJ[i].phenomenon_max_color_id
				});
				if(departmentDataJ[i].phenomenon_max_color_id > level) {
					level = departmentDataJ[i].phenomenon_max_color_id;
				}
			}
		}

		risks.sort((a, b) => Number(b.level) - Number(a.level));

		self.sendSocketNotification("DATA", JSON.stringify({
			"department": self.config.department,
			"level": level,
			"risks": risks
		}));
	},

	socketNotificationReceived: function(notification, payload) {
		var self = this;
		if(notification === 'CONFIG') {
			self.config = payload;
			self.sendSocketNotification("STARTED", true);
			self.getData();
		}
	}

});
