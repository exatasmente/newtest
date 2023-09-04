Feature: Add products to cart
	As a user
	I want to add products to cart
	So I can buy them


Background:
	Given I use the config
	```
	{
		"headless" : false,
		"viewport" : {
			"width" : 1280,
			"height" : 720
		},
		"emulate" : "Pixel 2",
		"recordVideo" : false,
		"scrollToInteract" : false
	}
	```
	And I define the variables
	```
	{
		"FecharCarrinhoBtn" : "$xPath(//*[@id='cart-content']/div/div[2]/div/div/div[2]/a)",
		"CarrinhoBtn" : "#cart-content > button",
		"PriceValues" : "$getElAttr(#price-values;innerText)", 
		"CarrinhoContainerDisplayStyle" : "$getElAttr(#cart-content > div;style.display)",
		"AbrirCarrinhoBtnDisplayStyle" : "$getElAttr($get(CarrinhoBtn);style.display)",
		"AddCarrinhoProduto1Btn" : "#hossomaki-camarao > div > button",
		"AddCarrinhoProduto2Btn" : "#hossomaki-salmao > div > button",
		"NOfItensInCartText" : "$getElAttr(#cart-content > button > div > span;innerText)",
		"NotificationElText" : "$getElAttr([x-data='window.notificationTracker()'];innerText)",
		"NotificationElOpacity" : "$getElAttr([x-data='window.notificationTracker()'];className)"
	}
	```

	


Scenario: Canvas 
	
	Given I on page "https://taikensushihouse.com.br/"
	When I wait for response
	```
	{
		"url" : "https://taikensushihouse.com.br/livewire/message/store.product-list",
		"method" : "POST",
		"status" : 200,
		"timeout" : 2000
	}
	```
	When I wait until "$wait($getElAttr($get(AddCarrinhoProduto1Btn);innerText); 2000)"
	And I click document "$get(AddCarrinhoProduto1Btn)"
	When I wait for response
	```
	{
		"url" : "https://taikensushihouse.com.br/livewire/message/store.cart",
		"method" : "POST",
		"status" : 200,
		"timeout" : 2000
	}
	```
	And I wait until "$wait($str($get(NotificationElText);includes;Produto adicionado à Sacola!);3000)"
	Then I expect "$get(NotificationElOpacity)" contains "opacity-100"
	And I expect "$get(NOfItensInCartText)" contains "1"
	When I wait until "$wait($str($get(NotificationElOpacity);contains;opacity-0);4000)"
	And I click document "$get(AddCarrinhoProduto2Btn)"
	And I wait until "$wait($str($get(NotificationElText);includes;Produto adicionado à Sacola!);3000)"
	Then I expect "$get(NotificationElOpacity)" contains "opacity-100"
	And I expect "$get(NOfItensInCartText)" contains "2"
	When I wait until "$wait($str($get(NotificationElOpacity);contains;opacity-0);10000)"
	Then I expect "$get(NotificationElOpacity)" contains "opacity-0"
	When I click document "$get(CarrinhoBtn)"
	And I wait until "$wait($str($get(CarrinhoContainerDisplayStyle);empty);2000)"
	And I expect "$get(PriceValues)" contains "R$ 26,48"
	And I setTimeout of 5 secs
	When I click document "$get(FecharCarrinhoBtn)"
	Then I expect "$get(AbrirCarrinhoBtnDisplayStyle)" be empty
	And I save the video "test"
	
	