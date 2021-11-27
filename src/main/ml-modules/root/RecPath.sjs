declareUpdate();

const PREFIX_PADDING_ALTCODE = "-"
const PREFIX_PADDING_PN = "-"
const TRACE_ID_1 = "xbom-1";
const TRACE_ID_2 = "xbom-2";
const TRACE_ID_3 = "xbom-3";
const TRACE_ID_LOG = "xbom-log";

const intersection = (arr1, arr2) => {
  const set = new Set(arr2);
  const intersection = new Set(arr1.filter(elem => set.has(elem)));
  return Array.from(intersection);
};

function pathZero(part,program) {
  let tmpPath = {};
  tmpPath.parent = "XXXXX";
  tmpPath.pn = part;
  tmpPath.altPathPad = "";
  tmpPath.altPathLevel = "";
  tmpPath.path = "/"+part+"###1";
  tmpPath.ca = "";
  tmpPath.caPath = "/"+part+"###1";
  tmpPath.caLevel = 0;
  tmpPath.ds = "";
  tmpPath.dsPath = "";
  tmpPath.dsLevel = "";
  tmpPath.level = 0;
  tmpPath.quantity = 1;
  tmpPath.quantityUnit = "EA";
  tmpPath.msns = cts.values(
    cts.jsonPropertyReference("msns"),
    null,
    null,
    cts.andQuery([
      cts.collectionQuery(["eBomLink","upperLink","caLink"]),
      cts.jsonPropertyValueQuery("program",program),
      cts.jsonPropertyValueQuery("parent",part)
    ])).toArray().map( x=> Number(x));
  return tmpPath;
}

function generatePath(path, link) {
  let stop = false;
  const newPath = {}
  const linkDoc = fn.doc(link).toArray()[0].toObject();
  //let sample = { uri: link, content : linkDoc};
  xdmp.trace(TRACE_ID_LOG, "uri: "+link+"\n");

  // check if a loop
  stop = (fn.contains(path.path, linkDoc.child+'#'))? true : stop;
  if (stop) {
    xdmp.trace(TRACE_ID_3, "path stop loop: path:" + path.path + " ,child:" + linkDoc.child);
    return [newPath, stop];
  }
  if (typeof(linkDoc.msns) != "object")
    linkDoc.msns = [linkDoc.msns] //bug ds msns qd un seul avion pas un array
  linkDocMsnsLen= linkDoc.msns.length;
  pathMsnsLen = path.msns.length;
  var start = xdmp.elapsedTime();
//  newPath.msns = intersection(path.msns, linkDoc.msns)
  newPath.msns = path.msns.filter(value => linkDoc.msns.includes(value));
  var end = xdmp.elapsedTime();
  xdmp.trace(TRACE_ID_1, "linkdoc msns len=" + linkDoc.msns.length + " path msns len=" + path.msns.length + " result len=" + newPath.msns.length + " took " + end.subtract(start));
  // check if no more effectivities, stop recursity at this level
  stop = (newPath.msns.length == 0)? true :  stop;
  if (stop) {
    xdmp.trace(TRACE_ID_3, "path stop, msns empty: path:" + path.path + " ,child:" + linkDoc.child);
    return [newPath, stop];
  }

  newPath.pn = linkDoc.child;
  newPath.hash = xdmp.hash64(linkDoc.child)
  newPath.issue = linkDoc.childIssue;
  newPath.type = linkDoc.childType;
  newPath.program = linkDoc.program;
  newPath.parent = linkDoc.parent;
  newPath.parentHash = xdmp.hash64(linkDoc.parent)

  let itemNumber = (linkDoc.itemNumber) ? linkDoc.itemNumber+"" : "";
  let altCode = (linkDoc.altCode) ? linkDoc.altCode+"" : "";
  let quantity = (linkDoc.quantity) ? linkDoc.quantity+"" : "";

  let addToPath = "/" + linkDoc.child + "#" + itemNumber + "#" + altCode + "#" + quantity;
  if (linkDoc.childType == "CA" || linkDoc.childType == "ADAPCI") {
    newPath.ca = (linkDoc.childType == "ADAPCI" ) ? linkDoc.parent : ""
    newPath.caPath = path.caPath + addToPath;
    newPath.caLevel = path.caLevel + 1;
    newPath.ds = "";
    newPath.dsPath = "";
    newPath.dsLevel = "";
  } else {
    newPath.ca =  path.ca;
    newPath.caPath = path.caPath;
    newPath.caLevel = path.caLevel;
    if (linkDoc.childType == "ADAPDS" ) {
      newPath.ds = linkDoc.child;
      newPath.dsPath = addToPath;
      newPath.dsLevel = 0;
    }
    else {
      newPath.ds = path.ds;
      newPath.dsPath = path.dsPath + addToPath;
      newPath.dsLevel = path.dsLevel + 1;
    }
  }
  newPath.path = path.path + addToPath;
  newPath.level = path.level + 1;

 
  if (altCode) {
    newPath.altPathPad =  path.altPathPad + "/" + linkDoc.child.padStart(30, PREFIX_PADDING_PN) + "#" + altCode.padStart(3, PREFIX_PADDING_ALTCODE)
    newPath.altPathLevel = (path.altPathLevel ) ? path.altPathLevel + 1 : 0;
  }
  else {
    newPath.altPathPad = path.altPathPad;
    newPath.altPathLevel = path.altPathLevel
  }

  if (path.quantityUnit === "EA") {
    newPath.quantityUnit = linkDoc.quantityUnit;
    newPath.quantity = path.quantity * linkDoc.quantity;
  }
  else if (path.quantityUnit === "AS_NEEDED"){
    newPath.quantityUnit = "AS_NEEDED";
    newPath.quantity = 1;
  }
  else {
    newPath.quantityUnit = "ERROR";
    newPath.quantity = 1;
  }
  newPath.quantityLink = linkDoc.quantity;
  newPath.linkType = linkDoc.linkType;
  newPath.quantityUnitLink = linkDoc.quantityUnit;
  newPath.itemNumber = itemNumber;
  newPath.altCode = altCode;

  return [newPath, stop];
}

function getChildUri(linkUri,type) {
  linkUri = linkUri.toString()
  const split = linkUri.split((/(?:_|\/|\.)+/))
  const linkChild = split[4];
  const program = split[2];
  
  if (type == "ca") query = cts.andQuery([
    cts.collectionQuery(["caLink","upperLink"]),
    cts.jsonPropertyValueQuery("program", program),
    cts.jsonPropertyRangeQuery("parent", "=", linkChild )
  ]);
  if (type == "up") query = cts.andQuery([
    cts.collectionQuery(["upperLink"]),
    cts.jsonPropertyValueQuery("program", program),
    cts.jsonPropertyRangeQuery("parent", "=", linkChild )
  ]);
  if (type == "structure") query = cts.andQuery([
    cts.collectionQuery(["eBomLink"]),
    cts.jsonPropertyValueQuery("program", program),
    cts.jsonPropertyRangeQuery("parent", "=", linkChild ),
    cts.notQuery(cts.jsonPropertyValueQuery("childType", "CADNODE")),
    cts.notQuery(cts.jsonPropertyValueQuery("linkType", "EQ"))
  ]);
  if (type == "equipment") query = cts.andQuery([
    cts.collectionQuery(["eBomLink"]),
    cts.jsonPropertyValueQuery("program", program),
    cts.jsonPropertyRangeQuery("parent", "=", linkChild )
  ]);
  return cts.uris(null, null, query);
}

function traverseLinks(path, linkUri, type, init, pathNb) {
//  xdmp.trace(TRACE_ID_1, "traverseLinks::"+linkUri+"::"+type+"::"+init+"::"+pathNb);
  let pathCurrent
  if (init) {
    pathCurrent = path;
  } else {
    let generatePathArray = generatePath(path, linkUri);
    pathCurrent = generatePathArray[0];
    // si loop detected or empty msns during generatePath, stop the recursivity for this level
    if (generatePathArray[1]) {
//      xdmp.trace(TRACE_ID_2, "Loop detected voor "+linkUri);
      return;
    }
    /*
    xdmp.invokeFunction(
        () => xdmp.documentInsert(pathCurrent.path + ".json", pathCurrent, permissions.getDefaultPermissions(), ['pathRecusif']),
        {database: xdmp.database(config['SUPER-DATABASE']), update: 'true'}
    )
     */

    xdmp.trace(TRACE_ID_LOG, "Path inserted: "+pathCurrent.path+"\n");
    xdmp.documentInsert(pathCurrent.path + ".json", pathCurrent, {permissions : xdmp.defaultPermissions(),
                          collections : 'eBomLink/path'});

    
//    if (pathCurrent.pn.length == 18 && pathCurrent.quantity>1 )
//      xdmp.trace(TRACE_ID_LOG, "path qty: "+pathCurrent.path+", qty:"+pathCurrent.quantity+"\n");
      //const entries = Object.entries(pathCurrent);
      //for (const [key, value] of entries) {
      //      xdmp.log(`${key}: ${value} \n`)
      //};
    
    pathNb++;
  }

  const childrenUri = getChildUri(linkUri,type);
  for (let childUri of childrenUri) {
    traverseLinks(pathCurrent, childUri, type, false, pathNb);
  }
  return;
}

function genPath(startPath, startPart, program, type, init, pathNb) {
  var path = (startPath) ? cts.doc(startPath+".json").toObject() : pathZero(startPart,program);
  var link = "/xxxx/"+program+"_"+path.parent+"_"+path.pn+".json";
  return traverseLinks(path, link, type, init, pathNb);
}

module.exports = {
  genPath,
  pathZero
}
