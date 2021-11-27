'use strict';
let pathNb = 0;
let result = [];
let init = true;
const PREFIX_PADDING_ALTCODE = "-"
const PREFIX_PADDING_PN = "-"

function Array2csv(result) {
  var fields = Object.keys(result[0])
  var replacer = function(key, value) { return value === null ? '' : value } 
  var csv = result.map(function(row){
    return fields.map(function(fieldName){
      return JSON.stringify(row[fieldName], replacer)
    }).join(';')
  })
  csv.unshift(fields.join(';')) // add header column
  csv = csv.join('\n');
  return csv;
}

function linkFromPath(path) {
    let link = cts.uris(null, "limit=1",
        cts.andQuery([
            cts.collectionQuery(["eBomLink","caLink","upperLink"]),
            cts.jsonPropertyRangeQuery("parent", "=", path.parent ),
            cts.jsonPropertyValueQuery("program", path.program ),
            cts.jsonPropertyRangeQuery("child", "=", path.pn )
        ])
    ).toString()
    return link;
}


function generatePath(path, link) {
    const newPath = {}
    //xdmp.log("typeof(link): " + Object.prototype.toString.call(link));
    //xdmp.log("link: "+link);
    const linkDoc = fn.doc(link).toArray()[0].toObject();

    newPath.pn = linkDoc.child;
    newPath.hash = xdmp.hash64(linkDoc.child)
    newPath.issue = linkDoc.childIssue;
    newPath.type = linkDoc.childType;
    newPath.program = linkDoc.program;
    newPath.parent = path.pn;
    newPath.parentHash = path.hash
    
  
    let itemNumber = (linkDoc.itemNumber) ? linkDoc.itemNumber+"" : "";
    let altCode = (linkDoc.altCode) ? linkDoc.altCode+"" : "";
    let quantity = (linkDoc.quantity) ? linkDoc.quantity+"" : "";
  
    
    
    let addToPath = "/" + linkDoc.child + "#" + itemNumber + "#" + altCode + "#" + quantity;
    if (linkDoc.childType == "CA" || linkDoc.childType == "ADAPCI") {
                newPath.ca = (linkDoc.childType != "CA" || Path.ca == "" ) ? path.pn : path.ca
                newPath.caPath = path.caPath + addToPath;
                newPath.caLevel = (path.caLevel) ? path.caLevel + 1 : 0;
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
    newPath.level = (path.level != null) ? path.level + 1 : 0;
  
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
    //xdmp.log("linkDoc.msns"+linkDoc.msns)
    if (typeof(linkDoc.msns) != "object") linkDoc.msns = [linkDoc.msns] //bug ds msns qd un seul avion pas un array
    
    newPath.msns = path.msns.filter(value => linkDoc.msns.includes(value));

    return newPath;
};

function getChildUri(linkUri) {
    //xdmp.log("parentUri"+linkUri)
    let linkChild = linkUri.toString().split(".")[0].split("_")[2];
    let childUri = cts.uris(null, null,
        cts.andQuery([
            cts.collectionQuery(["eBomLink","caLink","upperLink"]),
            cts.jsonPropertyValueQuery("program", "SA"),
            cts.jsonPropertyRangeQuery("parent", "=", linkChild ),
            cts.notQuery(cts.jsonPropertyValueQuery("childType", "CADNODE")),
            cts.notQuery(cts.jsonPropertyValueQuery("linkType", "EQ"))
        ])
    )//.toArray()
    //xdmp.log("childUri"+childUri)
    return childUri;
}




function traverseLinks(path, linkUri) {
  let pathCurrent
  // for the first call no linkUri is provided
   if (!init) {
     pathCurrent = generatePath(path, linkUri);
     if (pathCurrent.msns.length == 0) return;
   } else {
     pathCurrent = path;
     init = false;
   }
 // result.push(pathCurrent);
  pathNb++;
  if (pathNb % 10000 == 0) xdmp.log("pathNb: "+ pathNb);
//  if (pathNb < 100) {
  const childrenUri = getChildUri(linkUri);
  for (let childUri of childrenUri) {
    traverseLinks(pathCurrent, childUri);
  }
 // }
  return;
};


function genPath(pathZero) {
  var path = cts.doc( pathZero + ".json").toObject();
  var linkZero = linkFromPath(path);
  traverseLinks(path, linkZero);
  return;
}

xdmp.log("new run")
//let path = '/DA000###1/DA999###1/DQ000###1/DQ270###1';
let path = '/DA000###1/DX999###1' ;
genPath(path);
//pathNb;
//Array2csv(result);
