"use strict";

import * as fs from "fs";
import * as path from "path";
import * as url from "url";
import * as tl from "vsts-task-lib/task";
import * as toolLib from 'vsts-task-tool-lib/tool';
import * as tr from "vsts-task-lib/toolrunner";
import * as utils from "./utilities";
import * as os from "os";

export default class ClusterConnection {
    private helmPath: string;
    public kubeconfigFile: string;
    private userDir: string;
    private version: string;

    constructor() {
        this.version = tl.getInput("helmVersion", true);
        this.helmPath = toolLib.findLocalTool("helm", this.version) + '/helm';
        this.userDir = utils.getNewUserDirPath();
    }

    private async initialize() {
        if(!this.helmPath || !fs.existsSync(this.helmPath))
        {
            tl.debug(tl.loc("DownloadingClient"));
            await utils.getHelm(this.version, true);
            this.helmPath = toolLib.findLocalTool("helm", this.version) + '/helm';
        }
    }

    public createCommand(): tr.ToolRunner {
        var command = tl.tool(this.helmPath);
        return command;
    }

    // get kubeconf
    public async open(kubernetesEndpoint?: string){
         await this.initialize();
         if (kubernetesEndpoint) {
            this.downloadKubeconfigFileFromEndpoint(kubernetesEndpoint);
         }
    }

    public close(): void {
        // all configuration ase in agent temp directory. Hence automatically deleted.
    }

    //excute helm command
    public execCommand(command: tr.ToolRunner, options?: tr.IExecOptions) {
        var errlines = [];
        command.on("errline", line => {
            errlines.push(line);
        });
        return command.exec(options).fail(error => {
            errlines.forEach(line => tl.error(line));
            throw error;
        });
    }

    // download kubernetes cluster config file from endpoint
    private downloadKubeconfigFileFromEndpoint(kubernetesEndpoint: string) : void {
        this.kubeconfigFile = path.join(this.userDir, "config");
        var kubeconfig = tl.getEndpointAuthorizationParameter(kubernetesEndpoint, 'kubeconfig', false);
        fs.writeFileSync(this.kubeconfigFile, kubeconfig);
    }

    private getExecutableExtention(): string {
        if(os.type().match(/^Win/)){
            return ".exe";
        }

        return "";
    }
}