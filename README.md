
[![Build Status](https://travis-ci.org/Pinoccio/pinoccio-db.svg)](http://travis-ci.org/Pinoccio/pinoccio-db)

  pinoccio-db
===============

store your sensor data for much win.

```
var pinoccioDB = require('pinoccio-db')

var db = pinoccioDB("./db");

// get all of the reports and data for troop 1.
db.get(1).on('data',function(data){

  if(data.report == "troop-data") // scout name etc.
  else // sensor reading etc.

  console.log(data)
})

```


API
---

### constructor/module.exports

#### pinoccioDB = require('pinoccio-db')(database dir / object);

this creates the pinoccioDB instance around the database at the data dir or the db passed in.

is has this api `\/`

### methods

#### get(troop[,scoutId],cb)
get troop and or scout objects with  their report values.

#### writeTroop(id,data,cb)
set key values in the troop data object.

#### deleteTroop(id,cb)
inserts a tombstone record for this scout so it;s data and events will no longer stream as a result from commands.

#### assignTroopKey(cb)
generate a new uniue troop key and local troop id. used in provisioning

#### getTroopIdFromKey(key,cb)
use a troop key to pull the local troop id.

#### writeScout(troop,id,data,cb)
set properties in the scout-data object

#### deleteScout(troop,id,cb)
inserts a tombstone record for this scout so it's data and events will no longer stream as a result from commands.

#### sync(options)
stream the current known state of your troops and the changes to that state as they happen.

- options (optional)
 - range , the section of your troop to sttream changes from. either undefined (all troops), a troop id or an array `[troop,scout]` (a specific scout)
 - tail , stream changes as they happen. defaults to true. 

returns a readable stream.

#### stats(troop,scout,options)

stream report events in time order from the database.

- troop , the troop id
- scout , the scout id
- options , either a string the report name or an object with these properties
  - report (required)
  - start , the time to start sending data from. optional defaults to 0
  - end , the timestamp in ms to stop sending data. this always sets tail to false
  - tail , if we should continue streaming reports as they happen. defaults to false

returns a readable stream

#### saveReportsStream()

this is how you write new data to the database. 

- returns a writeable stream.

expects a stream of objects with these properties

- scout
  the node id the report was triggered from.

- troop
  the mesh id the report came from.

- report 
  the name of the report

- data
  the report data object


optional.

- b
  if your scouts support it add a random flag that is generated at boot time. this value distinctly identifies each "boot". it's random so collisions are possible but it's very unlikely for collisions to happen close enough in time to trigger ambiguity.

- ms
  this is a value that increments from boot time. a message is unique to boot and millis.


#### getId(cb)

- cb , the callback for the result

get the uuid for this instance of the database. used in replicate which is TODO

#### getTroopData(id,cb)

- id , the troop id or troop key
- cb , the callback for the result

get only the troop data object. if you dont need the sensor values this is faster.

#### getScoutData(troopId,id,cb)
get only the scout data object. if you dont need the sensor values this is faster.

- troopId , the troop id
- id , the scout id
- cb , the callback for the result


### properties

#### db

this is the database instance.




background.
-----------


this is a database for meshes of "scouts". It manages the meshes as "troops".

It keeps sensor data in 2 views. The last known value and every value that has been sent ever by "report" name ordered by time.

It tracks metadata for troops so you can associate useful attributes. It's nice to name troops for example.

`TODO`
It is fully replicatable and multi master. 
//meshed boards independently create data. they inherently bring a sorting problem because they dont know what time it is

terms
-----

- "troop" is a mesh

- "scout" is a node in the mesh

- "troop key" is the value used to associate events with a troop id in this database. it should be secret.

-  "troop id"
    this database manages troop ids as an increment id. this is because the hardware will work best with one mesh of a given id in a particular location. in the case of many troop 1 in the same physical location 

data storage
------------
all changes are written to leveldb immediately. both an append only log section of the database and a view.

these sections are broken up into "sensor data" and "troop data". there is always a cached view of the current key values for any mesh.

`TODO`
As fast resources allow, data is removed from the log portion of the database and packed into "changes" log files. 
These files allow anyone to replicate the data

for each "report" we collect every data point you send. 


`TODO` log format
----------
all log files are sets of multibuffers (https://www.npmjs.com/package/multibuffer)

[varint][id][binary data]

the first one in any log file will contain it's uuid

the uuid multibuffer only ever contains the uuid [varint][id][uuid] // TODO

uuid multibuffers will be scattered at keyframe intervals throughout the log to enable streaming from arbitrary positions seekabiliity 


`TODO` replication format
-------------------

i use the dat replication format by default to send data.

https://github.com/mafintosh/dat-replication-protocol









