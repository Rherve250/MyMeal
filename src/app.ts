import { v4 as uuidv4 } from 'uuid';
import {  Server, StableBTreeMap, ic } from 'azle/experimental';
import express, { Request, Response,NextFunction } from 'express';
import * as crypto from "crypto";


interface User {
    user_id: string;
    email: string;
    password: string;
    role: "Customer" | "Chef" | "Admin";
    createdAt: Date,
    updatedAt: Date | undefined
};


interface Restaurant {
    
    restaurant_id: string;
    name: string,
    address: string;
    phone_number: string;
    email: string;
    description: string;
    createdAt: Date;
    updatedAt: Date
}

interface Menu {
    menu_id: string;
    restaurant_id: string;
    title: string;
    dishes: Dish[];
    createdAt: Date;
    updatedAt: Date

}

interface Dish {
    dish_id: string;
    name: string;
    ingredients: { [key:string]:any };
    price: number;
    chef_id: string;
    createdAt: Date;
    updatedAt: Date
}

interface Order {

    order_id: string;
    user_id: string;
    chef_id: string;
    dish_id:string;
    ingredients: { [key:string]:any };
    totalPrice: number;
    status:  "Adjust" | "Approved " |"delivered"
}

interface TokenPayload {
    email: string;
    expiresIn: number; // Expiration in seconds
}


const UserStorage = StableBTreeMap<string, User>(0);
const RestaurantStorage = StableBTreeMap<string, Restaurant>(1);
const MenuStorage = StableBTreeMap<string, Menu>(2);
const DishStorage = StableBTreeMap<string, Dish>(3);
const OrderStorage = StableBTreeMap<string, Order>(4)


// first user to register is assign to Admin-here function to check first user-
const userTaken =(email:string)=>{
    const users = UserStorage.values();
    if(users.length == 0){
        return 0
    }else {
        return users.map((user:User)=> user.email).includes(email)
    }

}

const userExist=(email: string)=>{
    const users = UserStorage.values();
    return users.map((user:User)=> user.email).includes(email)
}

const salt = '6df58f6fe1544a0f9e2dc24a95037f47'
function hashPassword(password:string){
    const hash = crypto.createHmac('sha256', salt); // Create a HMAC(Hash-based Message Authentication Code)
    hash.update(password); // Update the hash with the password
    return hash.digest('hex'); //Get the hash digest in hexadecimal format 
}

function comparePasswords(storedHash:string,providedPassword:string){
 const hashedProvidedPassword = hashPassword(providedPassword);
 return storedHash === hashedProvidedPassword;
}

const SECRET_KEY = "BESTicp";

export function generateToken(payload: TokenPayload): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = crypto.createHmac('sha256', SECRET_KEY).update(`${header}.${body}`).digest('base64');
    return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): TokenPayload | null {
    const [header, body, signature] = token.split('.');
    const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(`${header}.${body}`).digest('base64');
    
    if (signature !== expectedSignature) return null;

    const payload: TokenPayload = JSON.parse(Buffer.from(body, 'base64').toString());
    return payload.expiresIn > Math.floor(Date.now() / 1000) ? payload : null;
}


const auth =(req:any,res:Response,next: NextFunction)=>{
   try{
     const token = req.header("Authorization")?.split(" ")[1] || null;
     if(!token){
        return res.status(401).json({status: 401,error:"Please login"})
     }

     const dataValid:any= verifyToken(token);
     console.log(dataValid)
     if(!dataValid){
        return res.status(401).json({status: 401, error:"Login in again"})
     }
     if(!userExist(dataValid.email)){
        return res.status(404).json({status: 404, error: "user does not exit"})
     }
     const users = UserStorage.values();      
     const user = users.filter((item:User)=> item.email === dataValid.email)
     req.user = user[0];
     next();
   }catch(error:any){
    console.log(error)
    return res.status(500).json({status: 500, error: error.message})
   }
}

const checkRoles=(roles:string[])=>(req:any, res: Response, next:NextFunction)=>{
    try{
        const { role } = req.user;
        if(!roles.includes(role)){
            return res.status(404).json({status: 404, error: "You are unauthorized"})
        }
        next()
    }catch(error:any){
        return res.status(500).json({status: 500, error: error.message})
    }
}
export default Server(()=>{
    const app = express();
    app.use(express.json());
   
     app.post('/register',async(req:Request,res: Response)=>{
       try{
        const  { 
            password,
            email
        } = req.body;
        console.log(req.header("Authorization"))
        if(userTaken(email)){
            return res.status(404).json({status: 404, error: "User already exist!!!"})
        }else if(userTaken(email) === 0){
            const hashedPassword = hashPassword(password);
            const adminUser : User ={
                user_id: uuidv4(),
                password:hashedPassword,
                email,
                role: 'Admin',
                createdAt: getCurrentDate(),
                updatedAt: getCurrentDate()
            }

            UserStorage.insert(adminUser.user_id,adminUser);
            return res.status(201).json({status: 201, message:"You are register as admin"})
        }else {
            const hashedPassword = hashPassword(password)
            const newUser : User ={
                user_id: uuidv4(),
                password: hashedPassword,
                email,
                role: 'Customer',
                createdAt: getCurrentDate(),
                updatedAt: getCurrentDate()
            }
            UserStorage.insert(newUser.user_id,newUser);
            return res.status(201).json({status: 201, message:"You are register successfully"})   
        }
       }catch(error: any){
        console.log(error)
        return res.status(500).json({status: 500, error: error.message})
       }
     });

     app.post('/login',(req: any, res: Response)=>{
       try{
        const { email, password } = req.body;
        if(!userExist(email)){
            return res.status(401).json({status: 401, error:"User does not exist"})
        }
        const users = UserStorage.values();      
        const user = users.filter((item:User)=> item.email === email)

        if(!comparePasswords(user[0].password,password)){
            return res.status(401).json({status: 401, error : "Wrong password"})
        }
        const token = generateToken({ email:user[0].email , expiresIn: Math.floor(Date.now() / 1000) + 3600 })
        return res.status(200).json({status: 200, token})

       }catch(error:any){
        return res.status(500).json({status: 500, error: error.message})
       }
     });


     // admin get users 
     app.get('/Users', auth,checkRoles(['Admin']), (req: any,res:Response)=>{
        try{
            const users =UserStorage.values()
           return res.status(500).json({status: 200, users});
        }catch(error:any){
            return res.status(500).json({status: 500, error:error.message})
        }
     });
     app.post('/Users/changeRole/:userId', (req:Request,res:Response)=>{
        try{
           const UserOpt = UserStorage.get(req.params.userId);
           const { role } = req.body;
           if(!UserOpt){
               return res.status(404).json({status:404, error:"User does not exist"})
           }
           const updatedUser={
            ...UserOpt,
            role
           }
           UserStorage.insert(updatedUser.user_id,updatedUser);
           return res.status(200).json({status: 200, message: "role updated successfully"})
        }catch(error:any){
            return res.status(500).json({status:500, error:error.message})
        }
     })
     // Restaurant endpoints
    
     // #1. Add restaurant
     app.post("/Restaurant",auth, checkRoles(['Admin']),(req: Request, res:Response)=>{
      try{
        const {
            name,
            address,
            phone_number,
            email,
            description 
        } = req.body;

        const newResto: Restaurant={
            restaurant_id: uuidv4(),
            name,
            address,
            phone_number,
            email,
            description,
            createdAt: getCurrentDate(),
            updatedAt: getCurrentDate()
        }

        RestaurantStorage.insert(newResto.restaurant_id,newResto);
        return res.status(201).json({status: 201, message: "Restaurant created successfully"})   
      }catch(error:any){
        return res.status(500).json({status: 500, error: error.message})
      }


    });

//    // #2. Get all restaurant

   app.get('/Restaurant',(req: Request, res: Response)=>{
    try{
        const restaurants = RestaurantStorage.values()
        return res.status(200).json({status: 200, restaurants})
    }catch(error:any){
        return res.status(500).json({status: 500, error: error.message})
    }
   });

//    // # 3 get one restaurant

   app.get("/Restaurant/:id", (req: Request, res: Response)=>{
      try{
    
        const RestoOpt = RestaurantStorage.get(req.params.id)
        if(!RestoOpt){
            return res.status(404).json({status: 404, error: "Restaurant not found"})
        }

        return res.status(200).json({status: 200, RestoOpt})

      }catch(error:any){
        return res.status(500).json({status: 500, error:error.message})
      }
   })
 
//   // Menu endpoints
  
//   // #1 Add menu

  app.post("/Menu/:restoId",(req:Request,res:Response)=>{
     
    try{
       const { restoId } = req.params;

       const { title }= req.body;

    const RestoExist = RestaurantStorage.get(restoId)
    if(!RestoExist){
    return res.status(404).json({status: 404, error: "Resto does not exist"})
    }
       const newMenu: Menu={
           menu_id: uuidv4(),
           restaurant_id: restoId,
           title,
           createdAt: getCurrentDate(),
           updatedAt: getCurrentDate(),
           dishes: []
       }
       MenuStorage.insert(newMenu.menu_id,newMenu)
       return res.status(201).json({status: 201, message: "Menu created successfully"})
    }catch(error:any){
        return res.status(500).json({status: 500, error:error.message})
    }

  });

//   // #2 get All Menu
  app.get('/Menu',(req:Request,res: Response)=>{
    try{
       const Menus = MenuStorage.values();
       return res.status(200).json({status: 200, Menus})
    }catch(error:any){
        return res.status(500).json({status: 500, error: error.message})
    }
  });

//   // # get one Menu

  app.get('/Menu/:menuId',(req:Request,res:Response)=>{
    try{
       const MenuOpt = MenuStorage.get(req.params.menuId)
       if(!MenuOpt){
        return res.status(404).json({status: 404,error:"Menu not found"})
       }
       const Menu = MenuOpt;
       return res.status(200).json({status: 200, Menu})
    }catch(error:any){
        return res.status(500).json({status: 500, error: error.message})
    }
  });

//   // add a dish to a Menu
  app.post("/Menu/:menuId/:dishId", auth,checkRoles(['Admin']), (req:any,res:Response)=>{
     try{
        const MenuOpt = MenuStorage.get(req.params.menuId);
        const DishOpt = DishStorage.get(req.params.dishId);
    
        if((!MenuOpt) || (!DishOpt)) {
            return res.status(404).json({status:404, error:"Either menu or dish does not exist"})
        }
        if(MenuOpt.dishes.map((item)=>item.dish_id).includes(DishOpt.dish_id)){
            return res.status(404).json({ status: 404, error:"Already dish exist on the menu"})
        }
        const newDish:Dish = {
            ...DishOpt
        }
        MenuOpt.dishes.push(newDish);
        MenuStorage.insert(MenuOpt.menu_id,MenuOpt)
        return res.status(200).json({status: 200, message:"Dish added successfully"})
     }catch(error:any){
        return res.status(500).json({status: 500, error: error.message})
     }
    
  });
//  // add dish
 app.post('/Dish/:userId',auth,checkRoles(['Admin']),(req:Request,res:Response)=>{
    try{
        const { name, ingredients, price } = req.body;
        const userOpt= UserStorage.get(req.params.userId);

        if((!userOpt) || (userOpt.role !== "Chef")){
           return res.status(404).json({status:400, error: "Chef you provide does not exist"})
        }

        const NewDish: Dish={
            dish_id: uuidv4(),
            name,
            price,
            ingredients,
            chef_id: userOpt.user_id,
            createdAt: getCurrentDate(),
            updatedAt: getCurrentDate(),
          
        }
       DishStorage.insert(NewDish.dish_id,NewDish);
       return res.status(201).json({status: 201, message: "Dish created successfully"})
    }catch(error:any){
        return res.status(500).json({status: 500, error: error.message})
    }
  })   

  app.get("/Dish",(req:Request,res: Response)=>{
     try{
        const dishOpt = DishStorage.values();
        return res.status(200).json({status: 200, dishOpt})
     }catch(error:any){
        return res.status(500).json({status: 500, error: error.message})
     }
  });
  
  app.get("/Dish/:id",(req:Request,res: Response)=>{
    try{
        const { id } = req.params;
        const DishOpt = DishStorage.get(id);
        if(!DishOpt){
            return res.status(404).json({status: 404, error: "Dish not found"})
        }
        const dish = DishOpt
        return res.status(200).json({status: 200, dish})
    }catch(error:any){
       return res.status(500).json({status: 500, error: error.message})
    }
 });
  

  app.post('/Order/:dishId',auth,checkRoles(["Customer"]), (req:any,res:Response)=>{

    try{
        const { ingredients } = req.body;
        const DishOpt = DishStorage.get(req.params.dishId);
        if(!DishOpt){
            return res.status(404).json({status: 404, error:"Dish does not exist"});
        }
    
        const newOrder:Order = {
            order_id: uuidv4(),
            user_id: req.user.user_id,
            chef_id: DishOpt.chef_id,
            dish_id: req.params.dishId,
            ingredients,
            totalPrice: DishOpt.price,
            status: 'Adjust'
        }
    
        OrderStorage.insert(newOrder.order_id,newOrder);
        return res.status(201).json({status:201, message: "Ordered successfully"})
    }catch(error:any){
        return res.status(500).json({status:500, error:error.message});
    }     
  });

   app.post('/Order/status/:orderId', auth,checkRoles(['Chef','Admin']),(req:any, res:Response)=>{
    try{
        const { status } = req.body;
        const OrderOpt = OrderStorage.get(req.params.orderId);
    
    if(!OrderOpt){
      return res.status(404).json({status: 404, error: "The order doesn't exist"});
    }
    const orderUpdate:Order ={
        ...OrderOpt, status
    }
     OrderStorage.insert(orderUpdate.order_id,orderUpdate)
     return res.status(200).json({status:200, message:"Status updated successfully"})
    }catch(err:any){
        return res.status(500).json({status: 500, error:err.message})
    }
   });

   app.get("/Order",auth,checkRoles(['Customer','Chef','Admin']),(req:any,res:Response)=>{

    try{
        const orders = OrderStorage.values();
        if(orders.length === 0){
           return res.status(404).json({status:404, error:"Empty order"})
        }
        let MyOrder:Order[]=[];
        if(req.user.role === "Customer"){
             MyOrder = orders.filter((item)=> item.user_id === req.user.user_id);
        }else if(req.user.role === "Chef"){
            MyOrder = orders.filter((item)=>item.chef_id === req.user.user_id);
        }else{
             MyOrder = orders
        }
        return res.status(200).json({status:200, MyOrder})

    }catch(err:any){
        return res.status(500).json({status:500, error:err.message})
    }
   });
   
   app.get('/Order/:orderId',auth,checkRoles(['Customer','Chef','Admin']),(req:any,res:Response)=>{

    try{
        const OrderOpt = OrderStorage.get(req.params.orderId);
        if(!OrderOpt){
           return res.status(404).json({status:404, error:"The Order does not exist"})
        }
        if((OrderOpt.user_id === req.user.user_id )  || (OrderOpt.chef_id===req.user.user_id)){
            return res.status(200).json({status: 200, OrderOpt})
        }else if(req.user.role === 'Admin'){
            return res.status(200).json({status:200, OrderOpt})
        }else {
            return res.status(400).json({status:400,error:"You can not access this order"})
        }
    }catch(err:any){
        return res.status(500).json({status:500, error:err.message})
    }
   })

   const PORT = 3500
   return app.listen(PORT,()=>{
       console.log(`Server is running on port ${PORT}`)
   })
   
   })
   
   const getCurrentDate=()=>{
       const timestamp = new Number(ic.time());
       return new Date(timestamp.valueOf() / 1000_000);
   }
   
