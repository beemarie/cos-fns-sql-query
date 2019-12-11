/**
  *
  * main() will be run when you invoke this action
  *
  * @param Cloud Functions actions accept a single parameter, which must be a JSON object.
  *
  * @return The output of this action, which must be a JSON object.
  *
  */
const openwhisk = require('openwhisk');

async function main(params) {
  const namespace = process.env.__OW_NAMESPACE;
  const jsonobj = csvJSON(params.message.body);
  const classes = {};
  let currentid = '';

  // consolidate classes into one object
  for (let i = 0; i < jsonobj.length - 1; i += 1) {
    console.log("ITEM", jsonobj[i])
    if (i === 0 || currentid !== jsonobj[i].id) {
      currentid = jsonobj[i].id;
      classes[currentid] = [];
    }
    classes[currentid].push(jsonobj[i].class)
  }
  let keys = Object.keys(classes)
  let keynum = 0
  let bestMatch = ""
  // find the best match for each photo
  for (let key of keys) {
    let currentcount = 0;
    for (let i=0; i<keys.length; i++) {
      if (i != keynum) {
        count = findMatches(classes[key], classes[keys[i]])
        if (count > currentcount) {
          currentcount = count;
          console.log("KEYSI", keys[i]);
          bestMatch = keys[i];
        }
      }
    }
    keynum++
    let n = key.lastIndexOf('.');
    key = key.substring(0, n != -1 ? n : key.length);
    key.replace("needsMatch_", "")
    key = key + "_vr.txt"
    await readAndWriteObject(namespace, params.bucket, key, bestMatch)
  }
    
  return { message: 'Hello World' };
}
async function readAndWriteObject(namespace, bucket, key, bestMatch) {
  // object read
  const readResult = await callReadObject(namespace, bucket, key);
  const readResultJSON = JSON.parse(readResult.body);
  readResultJSON.bestMatch = bestMatch;

  // object write
  await callWriteObject(namespace, bucket, key, JSON.stringify(readResultJSON))
}

function callWriteObject(thenamespace, bucket, key, body) {
  const objectRead = `/${thenamespace}/cloud-object-storage/object-write`;
  const ignoreCerts = false;
  const ow = openwhisk({ ignoreCerts });
  return new Promise((resolve, reject) => {
    const blocking = true;
    const result = true;
    ow.actions.invoke({
      actionName: objectRead, blocking, result, params: { bucket, key, body },
    }).then((res) => {
      resolve(res);
    }).catch((error) => reject(error));
  });
}

function callReadObject(thenamespace, bucket, key) {
  const objectRead = `/${thenamespace}/cloud-object-storage/object-read`;
  const ignoreCerts = false;
  const ow = openwhisk({ ignoreCerts });
  return new Promise((resolve, reject) => {
    const blocking = true;
    const result = true;
    ow.actions.invoke({
      actionName: objectRead, blocking, result, params: { bucket, key },
    }).then((res) => {
      resolve(res);
    }).catch((error) => reject(error));
  });
}
function findMatches(array1, array2) {
  let count = 0;
  for (let i = 0; i < array1.length; i += 1) {
    if (array2.indexOf(array1[i]) > -1) {
      count += 1;
    }
  }
  return count;
}

// var csv is the CSV file with headers
function csvJSON(csv) {
  const lines = csv.split('\n');
  const result = [];
  const headers = lines[0].split(',');

  for (let i = 1; i < lines.length; i += 1) {
    const obj = {};
    const currentline = lines[i].split(',');

    for (let j = 0; j < headers.length; j += 1) {
      obj[headers[j]] = currentline[j];
    }
    result.push(obj);
  }
  return result;
}
