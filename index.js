var through = require('through')
var level = require('level');
var sublevel = require('level-sublevel');
var livestream = require('level-livestream');
var crypto = require('crypto');

// bam
module.exports = function(dir){
  var db, sep = 'ÿ';
  if(dir && dir.createReadStream){
    db = dir;
  } else {
    db = level(dir,{valueEncoding:'json'});
    db = sublevel(db);
  }
  var o = {
    db:db,
    getTroops:function(){
      var z = this;
      var out = {};
      z.db.createReadStream({start:"troops"+sep,end:"troops"+sep+sep}).on('data',function(data){
        if(data.key.indexOf('sync'+sep) > -1) {
         // TODO put sync stream in the troop section. 
        } else {
          out[data.value.id] = data.value;
        }
      }).on('error',function(err){
        cb(err);
      }).on('end',function(){
        cb(false,out);
      });
    },
    getTroop:function(id){
      var z = this;
      if(!id) return process.nextTick(function(){
        var e = new Error('id or token required to get troop');
        e.code = z.errors.noid;
        cb(e);
      });

      if(id.length == 32) {
        z.getTroopIdFromToken(id,function(err,id){
          if(err) return cb(err);
          db.get("troops"+sep+id,cb);
        });
      }
    },
    writeTroop:function(obj){
      // create and or update a troop.
      obj = obj||{};

      var z = this;
      var prefix = "troops"+sep;
      var id = obj.troop||obj.id;

      if(!id) {
        // make troop
        z.getNextId('troops',function(err,id){
          if(err) return cb(err);
          obj.neverConnected = true;
          obj.id = obj.troop = id;
          z.assignTroopToken({id:obj.id},function(err,token){
            obj.token = token;
            if(err) return cb(err);
            updateTroop(obj,cb);
          });         
        });
      } else {
        z.getTroop(id,function(err,data){
          if(err){
            if(err.code != z.errors.notroop) return cb(err);
            obj.neverConnected = true;

            obj.troop = obj.id = id;
            // if token is present is gets force assigned to this mystery troop.
            z.assignTroopToken({id:obj.id,token:obj.token},function(err,token){
              if(err) return cb(err);
              obj.token = token;
              z.db.put(prefix+obj.id,obj,cb);
            });
            return;
          }

          obj = _ext(data||{},obj);

          // i dont care if this troop id is the next increment just save a troop at this id.
          obj.troop = obj.id = id;

          z.db.put(prefix+obj.id,obj,cb);
        });
      }
    },
    sync:function(options){
      // TODO 

      var z = this;
      // todo support non live.
      return livestream(cb,{start:"troops"+sep,end:"troop"+sep+sep,old:true}).pipe(through(function(){
        // filter stale
        // filter dleted troops anmd scouts.
      }));
    },
    saveReportsStream:function(troopId){
      var z = this;
      var s = through(function(data){
        // set troop id in incomming reports
        data.troop = troopId;
        // insert into sync section and stats section
        //TODO
      });

      s.pipe(db.writeStream());

      return s;
    },
    assignTroopToken:function(obj,cb){
      obj = obj||{};
      var z = this;
      if(!obj.id) return process.nextTick(function(){
        var e = new Error("missing reqirted troop id assigning troop token");
        e.code = z.errors.token;
        cb()
      });

      var token = crypto.createHash('md5').update(crypto.randomBytes(210)).digest().toString('hex');
      if(obj.token) token = obj.token;
      z.db.put("token"+sep+token,obj.id);
    },
    getTroopIdFromToken:function(token,cb){
      this.db.get('token'+sep+token,cb);
    },
    getNextId:function fn(key,cb){
      key = 'ids'+sep+key;

      if(!fn.running) fn.running = {};
      if(fn.running[key]) return fn.running[key].push(cb); 
      fn.running = {};

      db.get(key,function(err,value){
        if(err) {
          if((err+'').indexOf('NotFoundError') === -1){
            return cb(err);
          } else {
            value = 1;
          }
        }

        putKey(value,cb);

        function putKey (value,cb){
          db.put(key,value,function(err){
            if(fn.running[key].length){
              putKey(1+value,fn.running[key].shift());
            } else {
              delete fn.running[key];
            }
            cb(err,value);
          })
        }
      });
    }, 
    errors:{notroop:"NoTroop",token:"NoTokenId",noid:"NoTroopId"}
  }


  return o;

}

function _ext(o1,o2){
  Object.keys(o2).forEach(function(k){
    o1[k] = o2[k];
  })
  return o1;
}