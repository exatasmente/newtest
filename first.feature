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
		"recordVideo" : true
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
	And I setTimeout of 1 secs
	When I click document "$get(AddCarrinhoProduto1Btn)"
	And I setTimeout of 1000 ms
	Then I expect "$get(NotificationElText)" contains "Produto adicionado à Sacola!"
	And I expect "$get(NotificationElOpacity)" contains "opacity-100"
	And I expect "$get(NOfItensInCartText)" contains "1"
	And I setTimeout of 5000 ms
	Then I expect "$get(NotificationElOpacity)" contains "opacity-0"
	When I click document "$get(AddCarrinhoProduto2Btn)"
	And I setTimeout of 1000 ms
	Then I expect "$get(NotificationElText)" contains "Produto adicionado à Sacola!"
	Then I expect "$get(NotificationElOpacity)" contains "opacity-100"
	And I expect "$get(NOfItensInCartText)" contains "2"
	And I setTimeout of 5000 ms
	Then I expect "$get(NotificationElOpacity)" contains "opacity-0"
	When I click document "$get(CarrinhoBtn)"
	And I setTimeout of 300 ms
	Then I expect "$get(CarrinhoContainerDisplayStyle)" be empty
	And I expect "$get(PriceValues)" contains "R$ 26,48"

	And I save the video "test"
	
	