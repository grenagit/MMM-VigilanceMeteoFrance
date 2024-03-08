/* MagicMirror²
 * Module: MMM-VigilanceMeteoFrance
 *
 * MagicMirror² By Michael Teeuw https://magicmirror.builders
 * MIT Licensed.
 *
 * Module MMM-VigilanceMeteoFrance By Grena https://github.com/grenagit
 * MIT Licensed.
 */

Module.register("MMM-VigilanceMeteoFrance", {

	// Default module config
	defaults: {
		appid: "",
		department: 0,
		excludedRisks: [],
		updateInterval: 1 * 60 * 60 * 1000, // every 1 hour
		animationSpeed: 1000, // 1 second
		notificationDuration: 1 * 60 * 1000, // 1 minute
		maxTextWidth: 0,
		maxRisksInline: 3,
		showDepartment: false,
		showDescription: false,
		showRiskLegend: true,
		showForecast: false,
		showNotification: true,
		hideGreenLevel: false,
		useColorLegend: true,

		initialLoadDelay: 0, // 0 seconds delay

		oauthEndpoint: "https://portail-api.meteofrance.fr/token",
		vigiEndpoint: "https://public-api.meteofrance.fr/public/DPVigilance/v1/cartevigilance/encours",
		frenchDepartmentsTable: {
			"1": "Ain",
			"2": "Aisne",
			"3": "Allier",
			"4": "Alpes-de-Haute-Provence",
			"5": "Hautes-Alpes",
			"6": "Alpes-Maritimes",
			"7": "Ardèche",
			"8": "Ardennes",
			"9": "Ariège",
			"10": "Aube",
			"11": "Aude",
			"12": "Aveyron",
			"13": "Bouches-du-Rhône",
			"14": "Calvados",
			"15": "Cantal",
			"16": "Charente",
			"17": "Charente-Maritime",
			"18": "Cher",
			"19": "Corrèze",
			"21": "Côte-d'Or",
			"22": "Côtes-d'Armor",
			"23": "Creuse",
			"24": "Dordogne",
			"25": "Doubs",
			"26": "Drôme",
			"27": "Eure",
			"28": "Eure-et-Loir",
			"29": "Finistère",
			"2A": "Corse-du-Sud",
			"2B": "Haute-Corse",
			"30": "Gard",
			"31": "Haute-Garonne",
			"32": "Gers",
			"33": "Gironde",
			"34": "Hérault",
			"35": "Ille-et-Vilaine",
			"36": "Indre",
			"37": "Indre-et-Loire",
			"38": "Isère",
			"39": "Jura",
			"40": "Landes",
			"41": "Loir-et-Cher",
			"42": "Loire",
			"43": "Haute-Loire",
			"44": "Loire-Atlantique",
			"45": "Loiret",
			"46": "Lot",
			"47": "Lot-et-Garonne",
			"48": "Lozère",
			"49": "Maine-et-Loire",
			"50": "Manche",
			"51": "Marne",
			"52": "Haute-Marne",
			"53": "Mayenne",
			"54": "Meurthe-et-Moselle",
			"55": "Meuse",
			"56": "Morbihan",
			"57": "Moselle",
			"58": "Nièvre",
			"59": "Nord",
			"60": "Oise",
			"61": "Orne",
			"62": "Pas-de-Calais",
			"63": "Puy-de-Dôme",
			"64": "Pyrénées-Atlantiques",
			"65": "Hautes-Pyrénées",
			"66": "Pyrénées-Orientales",
			"67": "Bas-Rhin",
			"68": "Haut-Rhin",
			"69": "Rhône",
			"70": "Haute-Saône",
			"71": "Saône-et-Loire",
			"72": "Sarthe",
			"73": "Savoie",
			"74": "Haute-Savoie",
			"75": "Paris",
			"76": "Seine-Maritime",
			"77": "Seine-et-Marne",
			"78": "Yvelines",
			"79": "Deux-Sèvres",
			"80": "Somme",
			"81": "Tarn",
			"82": "Tarn-et-Garonne",
			"83": "Var",
			"84": "Vaucluse",
			"85": "Vendée",
			"86": "Vienne",
			"87": "Haute-Vienne",
			"88": "Vosges",
			"89": "Yonne",
			"90": "Territoire de Belfort",
			"91": "Essonne",
			"92": "Hauts-de-Seine",
			"93": "Seine-Saint-Denis",
			"94": "Val-de-Marne",
			"95": "Val-d'Oise",
			"971": "Guadeloupe",
			"972": "Martinique",
			"973": "Guyane",
			"974": "La Réunion",
			"976": "Mayotte"
		}
	},

	// Define required styles
	getStyles: function() {
		return ["MMM-VigilanceMeteoFrance.css", "font-awesome.css"];
	},

	// Define required scripts
	getScripts: function() {
		return ["moment.js"];
	},

	// Define start sequence
	start: function() {
		Log.info("Starting module: " + this.name);

		moment.updateLocale(config.language);

		this.vigiWeatherCurrentLevel = null;
		this.vigiWeatherCurrentDescription = null;
		this.vigiWeatherFutureLevel = null;
		this.vigiWeatherCurrentRisks = [];
		this.vigiWeatherFutureRisks = [];

		this.lastData = {};

		this.loaded = false;

		this.scheduleUpdate(this.config.initialLoadDelay);
	},

	// Override dom generator
	getDom: function() {
		var wrapper = document.createElement("div");

		if(this.config.maxTextWidth != 0) {
			wrapper.style = "max-width: " + this.config.maxTextWidth + "px;";
		}

		if(typeof this.config.apiConsumerKey !== 'undefined' || typeof this.config.apiConsumerSecret !== 'undefined') {
			wrapper.innerHTML = "Please delete old MeteoFrance <i>keys</i> in the config for module: " + this.name + ".";
			wrapper.className = "dimmed light small";
			return wrapper;
		}
		
		if(!this.config.appid) {
			wrapper.innerHTML = "Please set the correct MeteoFrance <i>appid</i> in the config for module: " + this.name + ".";
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		if(!this.config.department) {
			wrapper.innerHTML = "Please set the vigilance <i>department</i> in the config for module: " + this.name + ".";
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		if(!this.loaded) {
			wrapper.innerHTML = this.translate("LOADING");
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		if(this.config.showDepartment) {
			var weatherDepartment = document.createElement('div');
			weatherDepartment.className = "dimmed light small department";

			weatherDepartment.innerHTML = this.config.frenchDepartmentsTable[this.config.department] + " (" + this.config.department + ")";

			wrapper.appendChild(weatherDepartment);
		}

		if(this.config.showForecast) {
			var weatherTitle = document.createElement("div");
			weatherTitle.className = "dimmed light xsmall title";

			weatherTitle.innerHTML = "Aujourd'hui :";

			wrapper.appendChild(weatherTitle);
		}

		var medium = document.createElement("div");
		medium.className = "normal medium level";

		var weatherIcon = document.createElement('span');

		weatherIcon.className = "fas fa-exclamation-circle dimmed";
		if(this.config.useColorLegend) {
			weatherIcon.style = "color: " + this.level2color(this.vigiWeatherCurrentLevel) + ";";
		}
		medium.appendChild(weatherIcon);

		var spacer = document.createElement("span");
		spacer.innerHTML = "&nbsp;";
		medium.appendChild(spacer);

		var weatherText = document.createElement("span");
		weatherText.innerHTML = " " + this.level2title(this.vigiWeatherCurrentLevel);
		medium.appendChild(weatherText);

		wrapper.appendChild(medium);

		if(this.config.showDescription) {
			var weatherDescription = document.createElement('div');
			weatherDescription.className = "light small description";

			weatherDescription.innerHTML = this.vigiWeatherCurrentDescription;

			wrapper.appendChild(weatherDescription);
		}

		if(this.vigiWeatherCurrentRisks) {
			var risks = document.createElement("div");
			risks.className = "normal small risks";

			for(let i = 0; i < this.vigiWeatherCurrentRisks.length; i++) {
				if(i > 0) {
					if(i % this.config.maxRisksInline == 0) {
						var breakline = document.createElement("br");
						risks.appendChild(breakline);
					} else {
						var spacer = document.createElement("span");
						spacer.innerHTML = "&nbsp;&nbsp;&nbsp;";
						risks.appendChild(spacer);
					}
				}

				var risksIcon = document.createElement('span');
				risksIcon.className = "fas fa-" + this.risk2icon(this.vigiWeatherCurrentRisks[i].id);
				if(this.config.useColorLegend) {
					risksIcon.style = "color: " + this.level2color(this.vigiWeatherCurrentRisks[i].level) + ";";
				}
				risks.appendChild(risksIcon);

				if(this.config.showRiskLegend) {
					var risksText = document.createElement("span");
					risksText.className = "dimmed light";
					risksText.innerHTML = "&nbsp;" + this.risk2legend(this.vigiWeatherCurrentRisks[i].id);
					risks.appendChild(risksText);
				}
			}

			wrapper.appendChild(risks);
		}

		if(this.config.showForecast) {
			var forecastTitle = document.createElement("div");
			forecastTitle.className = "dimmed light xsmall title";
			forecastTitle.innerHTML = "Demain :";

			wrapper.appendChild(forecastTitle);

			var medium = document.createElement("div");
			medium.className = "normal medium level";

			var weatherIcon = document.createElement('span');

			weatherIcon.className = "fas fa-exclamation-circle dimmed";
			if(this.config.useColorLegend) {
				weatherIcon.style = "color: " + this.level2color(this.vigiWeatherFutureLevel) + ";";
			}
			medium.appendChild(weatherIcon);

			var spacer = document.createElement("span");
			spacer.innerHTML = "&nbsp;";
			medium.appendChild(spacer);

			var weatherText = document.createElement("span");
			weatherText.innerHTML = " " + this.level2title(this.vigiWeatherFutureLevel);
			medium.appendChild(weatherText);

			wrapper.appendChild(medium);
		}

		return wrapper;
	},

	// Request new data from meteofrance.fr with node_helper
	socketNotificationReceived: function(notification, payload) {
		if(notification === "STARTED") {
			this.updateDom(this.config.animationSpeed);
		} else if(notification === "DATA") {
			this.processVigi(JSON.parse(payload));
		} else if(notification === "ERROR") {
			Log.error(this.name + ": Do not access to data (" + payload + ").");
			this.scheduleUpdate();
		} else if(notification === "DEBUG") {
			Log.log(payload);
		}
	},

	// Change the vigilance department upon receipt of notification
	notificationReceived: function(notification, payload) {
		if(notification === "VIGI_METEOFRANCE_DEPARTMENT" && payload != this.config.department) {
			this.config.department = payload;
			this.lastData = {};

			this.loaded = false;

			this.sendSocketNotification('CONFIG', this.config);
		}
	},

	// Use the received data to set the various values before update DOM
	processVigi: function(data) {
		if(!data || data.department != this.config.department || typeof data.levels === "undefined" || typeof data.risks === "undefined") {
			Log.error(this.name + ": Do not receive usable data.");
			return;
		}

		this.vigiWeatherCurrentLevel = data.levels.find(item => moment().isBetween(moment(item.begin), moment(item.end))).level;
		this.vigiWeatherCurrentDescription = data.levels.find(item => moment().isBetween(moment(item.begin), moment(item.end))).text;

		let futureLevelData = data.levels.find(item => moment().isBefore(moment(item.begin)));
		if(typeof futureLevelData !== "undefined") {
			this.vigiWeatherFutureLevel = futureLevelData.level;
		} else {
			this.config.showForecast = false;
			Log.error(this.name + ": Tomorrow’s vigilance data is not yet available, please wait until the next update (twice a day at 6am and 4pm).");
		}

		if(this.config.hideGreenLevel) {
			if(this.vigiWeatherCurrentLevel == 1) {
				this.hide();
			} else {
				this.show();
			}
		}

		if(this.config.showNotification) {
			if(!this.loaded && this.vigiWeatherCurrentLevel >= 2) {
				this.notifyVigi("Attention, votre <strong>département</strong> est placé en <strong>" + this.level2title(this.vigiWeatherCurrentLevel).toLowerCase() + "</strong> !");
			}
			if(this.loaded && this.vigiWeatherCurrentLevel > this.lastData.level) {
				this.notifyVigi("Attention, le <strong>niveau de vigilance</strong> augmente dans <strong>votre département</strong> !");
			}
			if(this.loaded && this.vigiWeatherCurrentLevel < this.lastData.level) {
				this.notifyVigi("Bonne nouvelle, le <strong>niveau de vigilance</strong> diminue dans <strong>votre département</strong> !");
			}
		}

		this.vigiWeatherCurrentRisks = data.risks.filter(item => moment().isBetween(moment(item.begin), moment(item.end)));
		this.vigiWeatherFutureRisks = data.risks.filter(item => moment().isBefore(moment(item.begin)));

		if(this.loaded && this.config.showNotification) {
			var self = this;
			let newRisks = self.vigiWeatherCurrentRisks.filter(function(obj) {
				return !self.lastData.risks.some(function(obj2) {
					return obj.id == obj2.id;
				});
			});
			if(newRisks.length == 1) {
				this.notifyVigi("Attention, un <strong>nouveau risque</strong> vient d'être <strong>signalé</strong> dans <strong>votre département</strong> !");
			} else if(newRisks.length > 1) {
				this.notifyVigi("Attention, de <strong>nouveaux risques</strong> viennent d'être <strong>signalés</strong> dans <strong>votre département</strong> !");
			}
		}

		this.loaded = true;
		this.lastData = {
			"risks": this.vigiWeatherCurrentRisks,
			"level": this.vigiWeatherCurrentLevel
		};
		this.updateDom(this.config.animationSpeed);
		this.scheduleUpdate();
	},

	// Schedule next update
	scheduleUpdate: function(delay) {
		var nextLoad = this.config.updateInterval;
		if(typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}

		var self = this;
		setTimeout(function() {
			self.sendSocketNotification('CONFIG', self.config);
		}, nextLoad);
	},

	// Convert risk's id to legend
	risk2legend: function(id) {
		switch(id) {
			case 1:
				return "Vent";
				break;
			case 2:
				return "Pluie-Inondation";
				break;
			case 3:
				return "Orages";
				break;
			case 4:
				return "Inondation";
				break;
			case 5:
				return "Neige";
				break;
			case 6:
				return "Canicule";
				break;
			case 7:
				return "Grand Froid";
				break;
			case 8:
				return "Avalanches";
				break;
			case 9:
				return "Vagues-Submersion";
				break;
		}
	},

	// Convert risk's id to icon
	risk2icon: function(id) {
		switch(id) {
			case 1:
				return "wind";
				break;
			case 2:
				return "cloud-showers-heavy";
				break;
			case 3:
				return "poo-storm";
				break;
			case 4:
				return "water";
				break;
			case 5:
				return "snowflake";
				break;
			case 6:
				return "thermometer-full";
				break;
			case 7:
				return "thermometer-empty";
				break;
			case 8:
				return "mountain";
				break;
			case 9:
				return "water";
				break;
		}
	},

	// Convert vigilance's level to color
	level2color: function(level) {
		switch(level) {
			case 1:
				return "#007b3d";
				break;
			case 2:
				return "#fff419";
				break;
			case 3:
				return "#ee750c";
				break;
			case 4:
				return "#b30000";
				break;
		}
	},

	// Convert vigilance's level to title
	level2title: function(level) {
		switch(level) {
			case 1:
				return "Vigilance verte";
				break;
			case 2:
				return "Vigilance jaune";
				break;
			case 3:
				return "Vigilance orange";
				break;
			case 4:
				return "Vigilance rouge";
				break;
		}
	},

	// Send notification
	notifyVigi: function(text) {
		this.sendNotification("SHOW_ALERT", {
			type: "notification",
			title: "Vigilance Météo France",
			message: text,
			timer: this.config.notificationDuration
		});
	}

});
