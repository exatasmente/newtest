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
		"emulate" : "iPhone X",
		"recordVideo" : true
	}
	```
	


Scenario: Canvas 
	
	Given I on page "https://taikensushihouse.com.br/"
	And I setTimeout of 1 secs
	Then I expect "$getElAttr(#cart-content > div;style.display)" contains "none"
	And I expect "$getElAttr($set(AbrirCarrinhoBtn;#cart-content > button);style.display)" be empty
	When I click document "$get(AbrirCarrinhoBtn)"
	And I setTimeout of 300 ms
	Then I expect "$getElAttr($get(AbrirCarrinhoBtn);style.display)" contains "none"
	And I expect "$getElAttr(#cart-content > div;style.display)" be empty
	When I click document "$xPath(//*[@id='cart-content']/div/div[2]/div/div/div[2]/a)"
	And I setTimeout of 300 ms
	Then I expect "$getElAttr($get(AbrirCarrinhoBtn);style.display)" be empty
	And I expect "$getElAttr(#cart-content > div;style.display)" contains "none"
	And I save the video "test"
	
	