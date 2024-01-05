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
		axios({
				url: self.config.oauthEndpoint,
				data: {
					'grant_type': 'client_credentials'
				},
				headers: {
					'Authorization': 'Basic ' + self.config.appid,
					'Accept': 'application/json'
				},
				method: 'post'
			})
			.then(function(response) {
				if(response.status == 200 && response.data) {
					// Get vigilance data
					axios({
							url: self.config.vigiEndpoint,
							headers: {
								'Authorization': 'Bearer ' + response.data.access_token,
								'Accept': 'application/json'
							},
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

		let periodsData = data.product.periods;

		let departmentDataJ = periodsData[0].timelaps.domain_ids.filter(item => item.domain_id == self.config.department)[0];
		let departmentDataJ1 = periodsData[1].timelaps.domain_ids.filter(item => item.domain_id == self.config.department)[0];

		let risks = [];
		let levels = [];

		for(let i = 0; i < 2; i++) {
			levels.push({
				"id": periodsData[i].echeance,
				"level": periodsData[i].timelaps.domain_ids.filter(item => item.domain_id == self.config.department)[0].max_color_id,
				"begin": periodsData[i].begin_validity_time,
				"end": periodsData[i].end_validity_time
			});
		}

		risks = self.formatRisks(departmentDataJ.phenomenon_items, periodsData[0]).concat(self.formatRisks(departmentDataJ1.phenomenon_items, periodsData[1]));
		risks.sort((a, b) => Number(b.level) - Number(a.level));

		self.sendSocketNotification("DATA", JSON.stringify({
			"department": self.config.department,
			"levels": levels,
			"risks": risks
		}));
	},

	formatRisks: function(phenomenonData, periodData) {
		var self = this;
		let risks = [];
   
		for(let i = 0; i < phenomenonData.length; i++) {
			if(!self.config.excludedRisks.includes(parseInt(phenomenonData[i].phenomenon_id)) && phenomenonData[i].phenomenon_max_color_id > 1) {
				let timelapsData = phenomenonData[i].timelaps_items;

				if(timelapsData.length > 0) {
					for(let j = 0; j < timelapsData.length; j++) {
						risks.push({
							"id": parseInt(phenomenonData[i].phenomenon_id),
							"level": timelapsData[j].color_id,
							"begin": timelapsData[j].begin_time,
							"end": timelapsData[j].end_time
						});
					}
				} else {
					risks.push({
						"id": parseInt(phenomenonData[i].phenomenon_id),
						"level": phenomenonData[i].phenomenon_max_color_id,
						"begin": periodData.begin_validity_time,
						"end": periodData.end_validity_time
					});
				}
			}
		}

		return risks;
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
