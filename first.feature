@core
Feature: My Feature
	As Autokin tester
	I want to verify that all API are working as they should
@chain
Scenario: Canvas 
	Given I on page "https://taikensushihouse.com.br/"
	Then I expect "$getElAttr($set(FecharCarrinho;$xPath(//*[@id='cart-content']/div));style.display)" contains "none"
	When I click document "$set(Carrinho;#cart-content > button)"
	Then I expect "$getElAttr($get(Carrinho);style.display)" contains "none"
	And I expect "$getElAttr($get(FecharCarrinho);style.display)" be empty
	When I click document "$get(FecharCarrinho)"
	Then I expect "$getElAttr($get(Carrinho);style.display)" contains "none"
	And I expect "$getElAttr($get(FecharCarrinho);style.display)" be empty
	