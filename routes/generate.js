var wrench = require('wrench'),
    util = require('util'),
    spawn = require('child_process').spawn,
    fs = require('fs'),
    async = require('async'),
    zip = require("node-native-zip");

/*
 * Project generator route.
*/
exports.index = function(req, res) {

    // 1. Create a temporary file(s) location.
    // 2. Rename the directories accordingly.
    // 3. Loop over all the files and perform replacements.
    // 4. Zip up the content & Send to the output stream
    // 5. Delete the temporary file(s).
    // 6. All Done - Do some 12 ounce curls.

    console.log(process.env.PWD);

    var appName = req.query.appName;
    var packageName = req.query.packageName;

    console.log("App Name:" + appName);
    console.log("Package Name:" + packageName);

    // Android Bootstrap source directory
    var sourceDir = process.env.PWD + '/zeta-bootstrap';
    // Temporary locationwhere the users project will be generated.
    var destDir = process.env.PWD + '/tmp/' + packageName;

    console.log("sourceDir: " + sourceDir);
    console.log("destDir: " + destDir);

    // Copy the files to temp directory.
    wrench.copyDirSyncRecursive(sourceDir, destDir);

    var theFiles = wrench.readdirSyncRecursive(destDir);
    console.log(theFiles);

    var callItems = [];


    theFiles.forEach(function(currentFile) {
      var genFileFunc = generateFileFunc(destDir + "/" + currentFile, packageName, appName);
      callItems.push(genFileFunc);

    });

    async.parallel(callItems, function(err, results) {

      if(err) {
        console.error("**** ERROR ****");
      } else {

        // Now, all items have been executed, perform the copying/etc.
        createSourceDirectories(destDir, packageName);
        copySourceDirectories(destDir, packageName);
        removeBootstrapDirectories(destDir);

        sendContentAsZip(destDir, res);

      }
    });
}

function sendContentAsZip(destDir, res) {

  var fileObjects = getFileObjectsFrom(destDir, wrench.readdirSyncRecursive(destDir));

  var archive = new zip();
  archive.addFiles(fileObjects, function(err) {
    if(err) {
      console.log(err);
      res.statusCode = 500;
      res.end();
    } else {

      archive.toBuffer(function (buff) {

        res.contentType('zip');
        res.setHeader('Content-disposition', 'attachment; filename='+this.appName+'.zip');
        res.send(buff);
        res.end();

        wrench.rmdirSyncRecursive(destDir, false)
      });
    }
  });
}

function getFileObjectsFrom(destDir, files) {
  var fileObjs = []
  for(var i=0; i<files.length;i++) {
    var filePath = destDir + "/" + files[i];
    var stats = fs.lstatSync(filePath);
    if(!stats.isDirectory())
      fileObjs.push({ name: files[i], path: filePath });
  }
  return fileObjs;
}

function generateFileFunc(file, packageName, appName) {
  return function(callback) {
    generateFile(file, packageName, appName, callback);
  }
}

function removeBootstrapDirectories(destDir) {

  // TODO: remove the old bootstrap source, unit-test and integration-test folders that are not valid anymore.
  console.log("Removing temporary work directories.");

  // Clean up - delete all the files we were just working with.

  var bootstrapAndroidTestDir = destDir + "/app/src/androidTest/java/zeta";
  var bootstrapAutomationDir = destDir + "/app/src/automation/java/zeta";
  var bootstrapDebugDir = destDir + "/app/src/debug/java/zeta";
  var bootstrapDebugTestDir = destDir + "/app/src/debugTest/java/zeta";
  var bootstrapSourceDir = destDir + "/app/src/main/java/zeta";
  var bootstrapReleaseDir = destDir +  "/app/src/release/java/zeta";

  console.log("Removing: " + bootstrapAndroidTestDir);
  console.log("Removing: " + bootstrapAutomationDir);
  console.log("Removing: " + bootstrapDebugDir);
  console.log("Removing: " + bootstrapDebugTestDir);
  console.log("Removing: " + bootstrapSourceDir);
  console.log("Removing: " + bootstrapReleaseDir);

  wrench.rmdirSyncRecursive(bootstrapAndroidTestDir, false);
  wrench.rmdirSyncRecursive(bootstrapAutomationDir, false);
  wrench.rmdirSyncRecursive(bootstrapDebugDir, false);
  wrench.rmdirSyncRecursive(bootstrapDebugTestDir, false);
  wrench.rmdirSyncRecursive(bootstrapSourceDir, false);
  wrench.rmdirSyncRecursive(bootstrapReleaseDir, false);

}

// Creates the various new folder structures needed for the users new project.
function createSourceDirectories(destDir, packageName) {

  var newPathChunk = getNewFilePath(packageName);

  var newAndroidTestDirectory = destDir + "/app/src/androidTest/java/" + newPathChunk;
  wrench.mkdirSyncRecursive(newAndroidTestDirectory);

  var newAutomationDirectory = destDir + "/app/src/automation/java/" + newPathChunk;
  wrench.mkdirSyncRecursive(newAutomationDirectory);

  var newDebugDirectory = destDir + "/app/src/debug/java/" + newPathChunk;
  wrench.mkdirSyncRecursive(newDebugDirectory);

  var newDebugTestDirectory = destDir + "/app/src/debugTest/java/" + newPathChunk;
  wrench.mkdirSyncRecursive(newDebugTestDirectory);

  var newSourceDirectory = destDir + "/app/src/main/java/" + newPathChunk;
  wrench.mkdirSyncRecursive(newSourceDirectory);

  var newReleaseDirectory = destDir + "/app/src/release/java/" + newPathChunk;
  wrench.mkdirSyncRecursive(newReleaseDirectory);

}

function copySourceDirectories(destDir, packageName) {

  console.log(destDir);
  console.log(packageName);

  var newPathChunk = getNewFilePath(packageName);

  var oldAndroidTestDir = destDir + "/app/src/androidTest/java/zeta/android/apps";
  var newAndroidTestDir = destDir + "/app/src/androidTest/java/" + newPathChunk;
  console.log("Copying source from" + oldAndroidTestDir  + " to directory " + newAndroidTestDir);
  wrench.copyDirSyncRecursive(oldAndroidTestDir , newAndroidTestDir);

  var oldAutomationDir = destDir + "/app/src/automation/java/zeta/android/apps";
  var newAutomationDir = destDir + "/app/src/automation/java/" + newPathChunk;
  console.log("Copying source from" + oldAutomationDir + " to directory " + newAutomationDir);
  wrench.copyDirSyncRecursive(oldAutomationDir, newAutomationDir);

  var oldDebugDir = destDir + "/app/src/debug/java/zeta/android/apps";
  var newDebugDir = destDir + "/app/src/debug/java/" + newPathChunk;
  console.log("Copying source from" + oldDebugDir + " to directory " + newDebugDir);
  wrench.copyDirSyncRecursive(oldDebugDir, newDebugDir);

  var oldDebugTestDir = destDir + "/app/src/debugTest/java/zeta/android/apps";
  var newDebugTestDir = destDir + "/app/src/debugTest/java/" + newPathChunk;
  console.log("Copying source from" + oldDebugTestDir + " to directory " + newDebugTestDir);
  wrench.copyDirSyncRecursive(oldDebugTestDir, newDebugTestDir);

  //Source
  var oldSourceDir = destDir  +  "/app/src/main/java/zeta/android/apps";
  var newSourceDir = destDir    +  "/app/src/main/java/" + newPathChunk;
  console.log("Copying source from" + oldSourceDir + " to directory " + newSourceDir);
  wrench.copyDirSyncRecursive(oldSourceDir, newSourceDir);

  var oldReleaseDir = destDir + "/app/src/release/java/zeta/andriod/apps";
  var newReleaseDir = destDir + "/app/src/release/java/" + newPathChunk;
  console.log("Copying source from" + oldReleaseDir + " to directory " + newReleaseDir);
  wrench.copyDirSyncRecursive(oldReleaseDir, newReleaseDir);

}

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

function generateFile(file, packageName, appName, callback) {

  var stats = fs.lstatSync(file);
  if(!stats.isDirectory() && !file.endsWith(".png")) {
    // Only work with text files, no directories or png files.
    // Above == terrible code, but for android-bootstrap, it works. Pragmatic & KISS. FTW.

    // Must include the encoding otherwise the raw buffer will
    // be returned as the data.
    var data = fs.readFileSync(file, 'utf-8');

    //console.log("Current File: " + file);

    console.log("File: " + file);
    // Sure, we could chain these, but this is easier to read.
    data = replacePackageName(data, packageName);
    data = replaceAuthToken(data, packageName);
    data = replaceAppName(data, appName);
    data = replaceHyphenatedNames(data, packageName);
    data = replaceProguardValues(data, packageName);

    // Finally all done doing replacing, save this bad mother.
    fs.writeFileSync(file, data);
  }

   // Call back to async lib.
    callback(null, file);
}


// Turns a package name into a file path string.
// Example: com.foo.bar.bang turns into com\foo\bar\bang
function getNewFilePath(newPackageName) {
  return newPackageName.split('.').join('/');
}

function getOldFilePath() {
  return "zeta.android.apps".split('.').join('/');
}

// Takes the old boostrap file name and returns the new file name
// that is created via the transform from the new package name.
function getBootstrappedFileName(bootstrapFileName, newPackageName) {
  return bootstrapFileName.replace( getOldFilePath(), getNewFilePath(newPackageName) );
}

function replacePackageName(fileContents, newPackageName) {
  var BOOTSTRAP_PACKAGE_NAME = "zeta.android.apps"; // replace all needs a regex with the /g (global) modifier
  var packageNameRegExp = new RegExp(BOOTSTRAP_PACKAGE_NAME, 'g');

  // Replace package name
  return fileContents.replace(packageNameRegExp, newPackageName);
}

function replaceAuthToken(fileContents, newPackageName) {
  var BOOTSTRAP_TOKEN = "com.androidbootstrap";
  var tokenRegExp = new RegExp(BOOTSTRAP_TOKEN, 'g'); // global search

  return fileContents.replace( tokenRegExp, newPackageName );
}

function replaceAppName(fileContents, newAppName) {
  var APP_NAME = "Zeta Bootstrap";
  var nameRegExp = new RegExp(APP_NAME, 'g'); // global search

  return fileContents.replace(nameRegExp, newAppName);
}

function replaceHyphenatedNames(fileContents, newPackageName) {
  var newHyphenatedName = newPackageName.toLowerCase().split('.').join('-');
  var hyphenatedRegExp = new RegExp("zeta-bootstrap", 'g'); // global search

  return fileContents.replace(hyphenatedRegExp, newHyphenatedName);
}

function replaceProguardValues(fileContents, newPackageName) {
  var newValue = newPackageName + '.';
  var valueToFind = new RegExp("zeta.android.", 'g');

  return fileContents.replace(valueToFind, newValue);
}
