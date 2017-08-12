"use strict";
import * as del from "del";
import * as fs from "fs";
import * as tr from "vsts-task-lib/toolrunner";
import trm = require('vsts-task-lib/toolrunner');
import * as path from "path";
import * as tl from "vsts-task-lib/task";
import ClusterConnection from "./clusterconnection";
import stream = require('stream');

export function run(connection: ClusterConnection, helmcommand: string, outputUpdate: (data: string) => any): any {
    var command = connection.createCommand();
    command.on("stdout", output => {
        outputUpdate(output);
    });

    // need to specify our kubectl as env since helm doesn't support it as a parameter
    // https://github.com/kubernetes/helm/pull/2621
    let options: tr.IExecOptions = {
        failOnStdErr: true,
        ignoreReturnCode: false,
        env: {
            HELM_HOME: process.env.HELM_HOME,
            KUBECONFIG: connection.kubeconfigFile
        },
        silent: false,
        cwd: process.cwd(),
        outStream: <stream.Writable>process.stdout,
        errStream: <stream.Writable>process.stderr,
        windowsVerbatimArguments: false
    };

    command.arg(helmcommand)
    command.arg(getCommandArguments());
    return connection.execCommand(command, options);
}

function getCommandArguments(): string[] {
    var args: string[] =[];
    var argument = tl.getInput("arguments", false);
    if(argument){
        args = argument.split(" ");
    }

    return args;
}