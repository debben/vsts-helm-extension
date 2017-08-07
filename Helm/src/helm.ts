"use strict";

import tl = require('vsts-task-lib/task');
import path = require('path');

import ClusterConnection from "./clusterconnection";
import * as helm from "./helmcommand";

tl.setResourcePath(path.join(__dirname, '..' , 'task.json'));
// Change to any specified working directory
tl.cd(tl.getInput("cwd"));

// open cluster connection and run the command
var connection = new ClusterConnection();
connection.open(tl.getInput("kubernetesServiceEndpoint", true)).then( 
    () => run(connection),
    (err) => tl.setResult(tl.TaskResult.Failed, err.message)
).catch((error) => tl.setResult(tl.TaskResult.Failed, error) );


function run(clusterConnection: ClusterConnection)
{
    executeHelmCommand(clusterConnection);
}

// execute Helm command
function executeHelmCommand(clusterConnection: ClusterConnection) : any {

    var command = tl.getInput("command", true);
    var result = "";
    var ouputVariableName =  tl.getInput("kubectlOutput", false);  
    helm.run(clusterConnection, command, (data) => result += data)
    .fin(function cleanup() {
        clusterConnection.close();
        if(ouputVariableName) {
            tl.setVariable(ouputVariableName, result);
        }
    })
    .then(function success() {
        tl.setResult(tl.TaskResult.Succeeded, "");
    }, function failure(err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    })
    .done();
}