# MyMeal Platform

**MyMeal** is a platform that connects users with restaurant chefs for a personalized dining experience. Built on the Internet Computer with Azle, it allows users to customize recipes, view detailed menus, and track orders. By facilitating direct chef interaction, MyMeal ensures tailored meal preparation and enhanced user satisfaction.


## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Canister Functions](#canister-functions)
- [Data Structures](#data-structures)
- [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Overview

MyMeal platform enable user:

- register and login.
- Get all restaurants
- Get single restaurant
- View all and one menu
- View all and one dish
- Order customized dish

MyMeal platform enable Admin:

- register and login.
- create and edit restaurant
- Create and edit menu
- Create,edit dish also add it to menu

## Getting Started

### Prerequisites

- Node.js (v18+)
- DFX (Internet Computer SDK)
- Azle (TypeScript framework for building canisters)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Rherve250/MyMeal.git
   cd MyMeal
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the local Internet Computer replica:

   ```bash
   dfx start --host 127.0.0.1:8000 --clean --background
   ```

4. Deploy the canister:

   ```bash
   dfx deploy
   ```


# Endpoints

 ## Authentication

- `POST /register` : Register user
  
  ` {email:"herve@gmail",password:"HelloIcp"} `

- `POST /login` : Login user
  
  ` {email:"herve@gmail",password:"HelloIcp"} `

  
 ## Restaurant
  
- `POST /Restaurant` :Add restaurant
  
 ` { name:"Ryves Resto",address: "kk20 ave",phone:"+2570980808",email:"RyvesResto@gmail.com",description:"The best Resto in Town" } `
  
-`GET /Restaurant`: Get all restaurant
- `GET /Restaurant/:id `: Get one restaurant

## Menu

- `POST /Menu/:restoId` :  Add Menu
   ` { title: "Boiled"} `
- `GET /Menu `: Get All Menu
- `GET /Menu/:menuId` : Get one Menu
- `POST /Menu/:menuId/:dishId` : Add a Dish to a Menu
## Dish

- `POST /Dish/:userId` : Add dish
  ````
  { name: "Burger", ingredients: {bread:"high",salt:"low", meat: "medium "},price:4000}
  
  ````
- `GET /Dish `: Get all dish
- ` GET /Dish/:id`: Get one dish

## Order

- `POST /Order/:dishId `: Order customized dish
` { ingredients: {bread:"high",salt:"none", meat: "medium "}} `
- ` POST /Order/status/:orderId` : Updated the order status
`{status: "Approved"} `

- ` GET /Order`: Get your orders
- ` GET /Order/:orderId`: Get one order


## Contributing

Contributions are encouraged! You are welcome to submit a pull request or create an issue for any bugs or feature suggestions.



