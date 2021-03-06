App = {
	web3Provider: null,
	contracts: {},

	init: async function() {
		// Load pets.
		$.getJSON('pets.json', function(data) {
			var petsRow = $('#petsRow');
			var petTemplate = $('#petTemplate');

			for (var i = 0; i < data.length; i ++) {
				petTemplate.find('.panel-title').text(data[i].name);
				petTemplate.find('img').attr('src', data[i].picture);
				petTemplate.find('.pet-breed').text(data[i].breed);
				petTemplate.find('.pet-age').text(data[i].age);
				petTemplate.find('.pet-location').text(data[i].location);
				petTemplate.find('.btn-adopt').attr('data-id', data[i].id);

				petsRow.append(petTemplate.html());
			}
		});

		return await App.initWeb3();
	},

	initWeb3: async function() {
		// Is there an injected web3 instance?
		if (typeof web3 !== 'undefined') {
			App.web3Provider = web3.currentProvider;
		} else {
			// If no injected web3 instance is detected, fall back to Ganache
			App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
		}
		web3 = new Web3(App.web3Provider);

		return App.initContract();
	},

	initContract: function() {
		$.getJSON('Adoption.json', function(data) {
			// Get the necessary contract artifact file and instantiate it with truffle-contract
			var AdoptionArtifact = data;
			App.contracts.Adoption = TruffleContract(AdoptionArtifact);

			// Set the provider for our contract
			App.contracts.Adoption.setProvider(App.web3Provider);

			// Use our contract to retrieve and mark the adopted pets
			return App.markAdopted();
		});

		return App.bindEvents();
	},

	bindEvents: function() {
		$(document).on('click', '.btn-adopt', App.handleAdopt);
	},

	markAdopted: function() {
		var adoptionInstance;
		web3.eth.getAccounts(function(error, accounts) {
			if (error) {
				console.log(error);
			}
			console.log(accounts);
			var currentAccount = accounts[0];
			// 调用合约
			App.contracts.Adoption.deployed().then(function(instance) {
				adoptionInstance = instance;
				// 调用合约的getAdopters(), 用call读取信息不用消耗gas
				return adoptionInstance.getAdopters.call();
			}).then(function(adopters) {
				console.log(adopters);
				for (i = 0; i < adopters.length; i++) {
					if (adopters[i] !== '0x0000000000000000000000000000000000000000') {
						var mark = currentAccount == adopters[i] ? '我已领养' : '已被领养';
						$('.panel-pet').eq(i).find('button').text(mark).attr('disabled', true);
					}
				}
			}).catch(function(err) {
				console.log(err.message);
			});
		});

	},

	handleAdopt: function(event) {
		event.preventDefault();
		var petId = parseInt($(event.target).data('id'));
		var adoptionInstance;
		// 获取用户账号
		web3.eth.getAccounts(function(error, accounts) {
			if (error) {
				console.log(error);
			}
			var account = accounts[0];
			console.log(account)
			App.contracts.Adoption.deployed().then(function(instance) {
				adoptionInstance = instance;
				// 发送交易领养宠物
				return adoptionInstance.adopt(petId, {from: account});
			}).then(function(result) {
				return App.markAdopted();
			}).catch(function(err) {
				console.log(err.message);
			});
		});
	}
};

$(function() {
	$(window).load(function() {
		App.init();
	});
});
