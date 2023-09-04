Feature: My Feature
	As Autokin tester
	I want to verify that all API are working as they should

Background:
	Given I use the config
	```
	{
		"headless" : false,
		"viewport" : {
			"width" : 1280,
			"height" : 720
		},
		"slowMo" : 100,
		"emulate" : "iPhone X",
		"recordVideo" : true
	}
	```
	And I define the variables
	```
	{
		"FecharCarrinhoBtn" : "$xPath(//*[@id='cart-content']/div/div[2]/div/div/div[2]/a)",
		"CarrinhoBtn" : "#cart-content > button",
		"CarrinhoContainerDisplayStyle" : "$getElAttr(#cart-content > div;style.display)",
		"AbrirCarrinhoBtnDisplayStyle" : "$getElAttr($get(CarrinhoBtn);style.display)"

	}
	```

	


Scenario: Canvas 
	
	Given I on page "https://taikensushihouse.com.br/"
	And I setTimeout of 1 secs
	Then I expect "$get(CarrinhoContainerDisplayStyle)" contains "none"
	And I expect "$get(AbrirCarrinhoBtnDisplayStyle)" be empty
	When I click document "$get(CarrinhoBtn)"
	And I setTimeout of 300 ms
	Then I expect "$get(AbrirCarrinhoBtnDisplayStyle)" contains "none"
	And I expect "$get(CarrinhoContainerDisplayStyle)" be empty
	When I click document "$get(FecharCarrinhoBtn)"
	And I setTimeout of 300 ms
	Then I expect "$get(AbrirCarrinhoBtnDisplayStyle)" be empty
	And I expect "$get(CarrinhoContainerDisplayStyle)" contains "none"
	And I save the video "test"
	
	