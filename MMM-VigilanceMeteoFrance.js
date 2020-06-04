/* Magic Mirror
 * Module: MMM-VigilanceMeteoFrance
 *
 * Magic Mirror By Michael Teeuw https://magicmirror.builders
 * MIT Licensed.
 *
 * Module MMM-VigilanceMeteoFrance By Grena https://github.com/grenagit
 * MIT Licensed.
 */

Module.register("MMM-VigilanceMeteoFrance",{

	// Default module config
	defaults: {
		department: 0,
		updateInterval: 1 * 60 * 60 * 1000, // every 1 hour
		animationSpeed: 1000, // 1 second
		notificationDuration: 1 * 60 * 1000, // 1 minute
		maxTextWidth: 0,
		showDepartment: false,
		showDescription: false,
		showRiskLegend: true,
		showNotification: true,
		useColorLegend: true,

		initialLoadDelay: 0, // 0 seconds delay

		apiBase: "http://vigilance2019.meteofrance.com/",
		vigiEndpoint: "data/NXFR33_LFPW_.xml",
		frenchDepartmentsTable: {
			"01": "Ain",
			"02": "Aisne",
			"03": "Allier",
			"04": "Alpes-de-Haute-Provence",
			"05": "Hautes-Alpes",
			"06": "Alpes-Maritimes",
			"07": "Ardèche",
			"08": "Ardennes",
			"09": "Ariège",
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

	// Define required scripts
	getStyles: function() {
		return ["MMM-VigilanceMeteoFrance.css", "font-awesome.css"];
	},


	// Define start sequence
	start: function() {
		Log.info("Starting module: " + this.name);

		this.vigiWeatherLevel = null;
		this.vigiWeatherTitle = null;
		this.vigiWeatherDescription = null;
		this.vigiWeatherRisks = [];
		this.vigiWeatherRisksLevel = [];
		this.vigiWeatherRisksLegend = [];
		this.vigiWeatherRisksIcon = [];

		this.lastData = {};

		this.loaded = false;

		this.scheduleUpdate(this.config.initialLoadDelay);
	},

	// Override dom generator
	getDom: function() {
		var wrapper = document.createElement("div");

		if (this.config.maxTextWidth != 0) {
			wrapper.style = "max-width: " + this.config.maxTextWidth + "px;";
		}

		if (!this.config.department) {
			wrapper.innerHTML = "Please set the vigilance <i>department</i> in the config for module: " + this.name + ".";
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		if (!this.loaded) {
			wrapper.innerHTML = this.translate("LOADING");
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		if (this.config.showDepartment) {
			var weatherDepartment = document.createElement('div');
			weatherDepartment.className = "dimmed light small department";

			weatherDepartment.innerHTML = this.config.frenchDepartmentsTable[this.config.department] + " (" + this.config.department + ")";

			wrapper.appendChild(weatherDepartment);
		}

		var medium = document.createElement("div");
		medium.className = "normal medium title";

		var weatherIcon = document.createElement('span');

		weatherIcon.className = "fas fa-exclamation-circle dimmed";
		if (this.config.useColorLegend) {
			weatherIcon.style = "color: " + this.level2color(this.vigiWeatherLevel) + ";";
		}
		medium.appendChild(weatherIcon);

		var spacer = document.createElement("span");
		spacer.innerHTML = "&nbsp;";
		medium.appendChild(spacer);

		var weatherText = document.createElement("span");
		weatherText.innerHTML = " " + this.vigiWeatherTitle;
		medium.appendChild(weatherText);

		wrapper.appendChild(medium);

		if (this.config.showDescription) {
			var weatherDescription = document.createElement('div');
			weatherDescription.className = "light small description";

			weatherDescription.innerHTML = this.vigiWeatherDescription;

			wrapper.appendChild(weatherDescription);
		}

		if (this.vigiWeatherRisks) {
			var risks = document.createElement("div");
			risks.className = "normal small risks";

			for (let i = 0; i < this.vigiWeatherRisks.length; i++) {
				if (i > 0) {
			 		var spacer = document.createElement("span");
					spacer.innerHTML = "&nbsp;&nbsp;&nbsp;";
					risks.appendChild(spacer);
				}

				var risksIcon = document.createElement('span');
				risksIcon.className = "fas fa-" + this.vigiWeatherRisksIcon[i];
				if (this.config.useColorLegend) {
					risksIcon.style = "color: " + this.level2color(this.vigiWeatherRisksLevel[i]) + ";";
				}
				risks.appendChild(risksIcon);

				if (this.config.showRiskLegend) {
					var risksText = document.createElement("span");
					risksText.className = "dimmed light";
					risksText.innerHTML = "&nbsp;" + this.vigiWeatherRisksLegend[i];
					risks.appendChild(risksText);
				}
			}

			wrapper.appendChild(risks);
		}

		return wrapper;
	},

	// Request new data from vigilance.weatherfrance.com with node_helper
	socketNotificationReceived: function(notification, payload) {
		if (notification === "STARTED") {
			this.updateDom(this.config.animationSpeed);
		} else if (notification === "ERROR") {
			Log.error(this.name + ": Do not access to data (" + payload + " HTTP error).");
		} else if (notification === "DATA") {
			this.processVigi(JSON.parse(payload));
		}
	},

	// Change the vigilance department upon receipt of notification
	notificationReceived: function(notification, payload) {
		if (notification === "VIGI_METEOFRANCE_DEPARTMENT" && payload != this.config.department) {
			this.config.department = payload;
			this.lastData = {};

			this.loaded = false;

			this.sendSocketNotification('CONFIG', this.config);
		}
	},

	// Use the received data to set the various values before update DOM
	processVigi: function(data) {
		if (!data || data.department != this.config.department || !data.level || typeof data.risks === "undefined") {
			Log.error(this.name + ": Do not receive usable data.");
			return;
		}

		this.vigiWeatherLevel = data.level;
		switch (data.level) {
			case 1:
				this.vigiWeatherTitle = "Vigilance verte";
				this.vigiWeatherDescription = "Pas de vigilance particulière.";
				this.vigiWeatherColor = "vert";
				break;
			case 2:
				this.vigiWeatherTitle = "Vigilance jaune";
				this.vigiWeatherDescription = "Soyer attentif si vous pratiquez des activités sensibles au risque météorologique.";
				this.vigiWeatherColor = "jaune";
				break;
			case 3:
				this.vigiWeatherTitle = "Vigilance orange";
				this.vigiWeatherDescription = "Soyez très vigilant, des phénomènes dangereux sont prévus.";
				this.vigiWeatherColor = "orange";
				break;
			case 4:
				this.vigiWeatherTitle = "Vigilance rouge";
				this.vigiWeatherDescription = "Une vigilance absolue s'impose, des phénomènes dangereux d'intensité exceptionnelle sont prévus.";
				this.vigiWeatherColor = "rouge";
				break;
		}

		if(this.config.showNotification) {
			if(!this.loaded && data.level >= 2) {
				this.notifyVigi("Attention, votre <strong>département</strong> est placé en <strong>vigilance " + this.vigiWeatherColor + "</strong> !");
			}
			if(this.loaded && data.level > this.lastData.level) {
				this.notifyVigi("Attention, le <strong>niveau de vigilance</strong> augmente dans <strong>votre département</strong> !");
			}
			if(this.loaded && data.level < this.lastData.level) {
				this.notifyVigi("Bonne nouvelle, le <strong>niveau de vigilance</strong> diminue dans <strong>votre département</strong> !");
			}
		}

		this.vigiWeatherRisks = [];
		this.vigiWeatherRisksLevel = [];
		this.vigiWeatherRisksLegend = [];
		this.vigiWeatherRisksIcon = [];

		if (data.risks.length > 0) {
			for (let i = 0; i < data.risks.length; i++) {
				this.vigiWeatherRisks[i] = data.risks[i].id;
				this.vigiWeatherRisksLevel[i] = data.risks[i].level;

				switch (data.risks[i].id) {
					case 1:
						this.vigiWeatherRisksLegend[i] = "Vent";
						this.vigiWeatherRisksIcon[i] = "wind";
						break;
					case 2:
						this.vigiWeatherRisksLegend[i] = "Pluie-Inondation";
						this.vigiWeatherRisksIcon[i] = "cloud-showers-heavy";
						break;
					case 3:
						this.vigiWeatherRisksLegend[i] = "Orages";
						this.vigiWeatherRisksIcon[i] = "poo-storm";
						break;
					case 4:
						this.vigiWeatherRisksLegend[i] = "Inondation";
						this.vigiWeatherRisksIcon[i] = "water";
						break;
					case 5:
						this.vigiWeatherRisksLegend[i] = "Neige";
						this.vigiWeatherRisksIcon[i] = "snowflake";
						break;
					case 6:
						this.vigiWeatherRisksLegend[i] = "Canicule";
						this.vigiWeatherRisksIcon[i] = "thermometer-full";
						break;
					case 7:
						this.vigiWeatherRisksLegend[i] = "Grand Froid";
						this.vigiWeatherRisksIcon[i] = "thermometer-empty";
						break;
					case 8:
						this.vigiWeatherRisksLegend[i] = "Avalanches";
						this.vigiWeatherRisksIcon[i] = "mountain";
						break;
					case 9:
						this.vigiWeatherRisksLegend[i] = "Vagues-Submersion";
						this.vigiWeatherRisksIcon[i] = "water";
						break;
				}
			}
		}

		if(this.loaded && this.config.showNotification) {
			var self = this;
			let newRisks = data.risks.filter(function(obj) {
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
		this.lastData = data;
		this.updateDom(this.config.animationSpeed);
		this.scheduleUpdate();
	},

	// Schedule next update
	scheduleUpdate: function(delay) {
		var nextLoad = this.config.updateInterval;
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}

		var self = this;
		setTimeout(function() {
			self.sendSocketNotification('CONFIG', self.config);
		}, nextLoad);
	},

	// Convert vigilance's level to color
	level2color: function(level) {
		switch (level) {
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

	// Send notification 
	notifyVigi: function (text) {
		this.sendNotification("SHOW_ALERT", {
			type: "notification",
			title: "Vigilance Météo France",
			message: text,
			timer: this.config.notificationDuration
		});
	 }

});
