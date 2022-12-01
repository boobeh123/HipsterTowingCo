## Description
HipsterTowingCo is a full stack web application that allows businesses to expand their reach. 
The landing page provides company details, information, and hours of operation which can increase search engine results that display your business. 
Viewing your buisness on a mobile device is essential. Our design is responsive and is viewable across phones, tablets, laptops, and desktops.

Customers & employees can create an account with your website using their email. This email is saved into a database & may be used to send opt-in subscriber emails.

Registered customers can create orders by providing their vehicle information, location, and destination.
Registered employees login to the app to view & interact with customer requests:
Dispatchers can assign or unassign calls to a driver and change the status of the call.
Drivers can accept assigned calls, independently accept calls, and update their ETA. This ETA is visible to the customer & dispatcher.
Completed calls note which driver provided roadside assistance.

## Demo
https://www.youtube.com/embed/rqB_YZ-yiWA

## How It's Made 

### Frontend: 
Frontend: HTML5, CSS3, MaterializeCSS, EJS
The frontend is built in HTML and uses EJS to render dynamic variable data from the database. 
I used the MaterializeCSS framework to style the webpage and used components for the carousel, fixed sidenav/mobile sidenav, modal, cards, and collapsibles.
I used CSS to style the smaller details.

### Backend:
Backend: Node.js, Express.js, MongoDB & Mongoose.
The API is built on an Express server and follows the Model-View-Controller (MVC) design pattern.
There are two routes which contain a variety of GET, POST, PUT, and DELETE requests. 
There is a schema (model) for the data stored in the database, which is MongoDB for this project.
Finally, the project is deployed on cyclic which can be viewed here: https://jittery-ray-outerwear.cyclic.app/

### Tech used:
<img src="https://profilinator.rishav.dev/skills-assets/html5-original-wordmark.svg" alt="HTML5" height="50" /><img src="https://profilinator.rishav.dev/skills-assets/css3-original-wordmark.svg" alt="CSS3" height="50" /><img src="https://profilinator.rishav.dev/skills-assets/javascript-original.svg" alt="JavaScript" height="40" /><img src="https://profilinator.rishav.dev/skills-assets/nodejs-original-wordmark.svg" alt="NodeJS" height="50" /><img src="https://profilinator.rishav.dev/skills-assets/mongodb-original-wordmark.svg" alt="MongoDB" height="50" /><img src="https://profilinator.rishav.dev/skills-assets/express-original-wordmark.svg" alt="ExpressJS" height="50" />
<img src="https://img.shields.io/badge/Materialize--CSS-ee6e73?style=for-the-badge&logoColor=white" alt="MaterializeCSS"/>
<img src="https://img.shields.io/badge/Mongoose.js-8A0403?style=for-the-badge&logoColor=white" alt="MongooseJS"/>
<img src="https://profilinator.rishav.dev/skills-assets/git-scm-icon.svg" alt="Git" height="50" />

## Optimizations 
* Viewable profiles
* Comments/reviews on profiles
* Add Passport-Google-OAuth-20 to support gmail login as a a registered user.
* Configure NodeMailer to support subscriber list emails
* Configure NodeMailer to support real-time updates for all involved parties
* Dynamic news/updates from State-Patrol twitter feed
* Geospatial data

## Lessons learned
This project has shown me that learning & understanding is displayed through building. 
There are several features I have seen for the first time. I had to learn more about it and implement in a way that fits the codebase in this project.
I experienced an undescribable feeling where I have watched this project grow from a blank page to where its at now. 
It came a long way and there is still so much more that can be added and improved on. 
I envision that this application has potential to become something with a global reach.