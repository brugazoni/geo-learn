AirPulse is an experience in sonification of air quality.

It leverages OpenAQ and WAQI data for pm2.5 indices, cleans up and stores the timestamped data in an sqlite database via an ETL python pipeline.

Then, a next.js API route is established for this data to be consumed by the front end running React. The front end leverages MapBox for map rendering and layering of the data.

Data is sonified via a simple puredata patch that was compiled via pd4web and consumed via hook. The sounds grow more distorted as more pollution is in focus.

You can navigate the map via midi controller, featuring midi zoom and out and observation station hopping.

This is a WIP version.