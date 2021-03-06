import React, {Component} from 'react';

class Start extends Component {
    constructor(props){
        super(props);

        this.state = {
            hostKey     : null,
            authType    : 'password',
            counter     : 0,
            loading     : false,
            force2      : false,
        }

        this.forms = {
            ssh     : {},
            proxy   : {},
        };

        this.customServerKey = '==custom==';

        Util.wait().then(Actions.start.getServers);
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        var panel = 1;

        var appData = nextProps.app;

        if(appData.currentRemote){
            panel = 2;

            if(appData.currentRoutes && !prevState.force2){
                panel = 3;
            }
        }

        return {panel: panel}
    }

    handleHostChange(evt, data){
        var servers = this.props.servers || [];
        var activeHostData = _.find(servers, {title: data.value});
        var authType = (activeHostData && activeHostData.identityFile) ? 'key' : 'password';
        // key status set
        if(authType === 'key')
            activeHostData.isKeySet = 1;

        this.setState({hostKey: data.value, authType: authType})
    }

    handleKeySetStatus(val){
        var servers = this.props.servers || [];
        var activeHostData = _.find(servers, {title: this.state.hostKey});
        activeHostData.isKeySet = val ? 1 : 0;
        this.setState({counter: this.state.counter+1})
    }

    handleAuthChange(evt, data){
        this.setState({authType: data.value})
    }

    componentDidMount(){
        this.doFocus();
    }

    componentDidUpdate(){
        this.doFocus();
    }

    doFocus(){
        console.log("Do fucusing", !!this.focusable);

        if(this.focusable)
            this.focusable.focus();
    }

    setPanel(num, extra){
        console.log("Setting panel", num);
        var data = {panel: num};
        if(extra)
            Object.assign(data, extra);

        this.setState(data)
    }

    checkTunnel(){
        var data = {};
        var self = this;

        self.setState({loading: true});

        _.each(this.forms.ssh, (ele, key)=>{
            data[key] = (ele && ele.state) ? ele.state.value : ele;
        });

        Handler.api.checkTunnel(data)
        .then(()=>finished(true))
        .catch(()=>finished(false))

        function finished(status){
            self.setState({loading: false});
            if(status){
                Actions.start.setCurrentRemote(data);
                Toast.success("Connection successful.");
            }
            else {
                Toast.error("An error occurred.");
            }
        }
    }

    setRoutes(){
        var data = this.getFormData('proxy');

        if(!data.remotePort)
            return handleErr("Remote port is required.");

        var route = false;
        if(data.app){
            // destination
            route = {destination: data.app};
            if(data.urlMatch)
                route.urlMatch = data.urlMatch;
        }

        var proxyConfig = {
            routes : [route]
        }

        var tunnelConfig = {
            remotePort: data.remotePort
        }

        this.startRouting({
            proxy   : proxyConfig,
            tunnel  : tunnelConfig,
        })
    }

    unsetRoutes(){
        Actions.start.setRoutes(null);
    }

    unsetRemote(){
        // unsets routes also
        Actions.start.setCurrentRemote(null);
    }

    connect(){
        var appData = this.props.app;
        this.startRouting(appData.currentRoutes)
    }

    startRouting(routing){
        var self = this;
        this.setState({
            loading     : true,
            force2      : false,
        })
        Actions.start.setRoutes(routing);

        return Handler.api.startProxy(routing.proxy)
        .then((config)=>{
            routing.tunnel.proxyPort = config.port;
            return Handler.api.startTunnel(routing.tunnel);
        })
        .then(()=>{
            Toast.success("Tunnel started");
            this.setState({loading: false})
            Actions.start.setTunnelStatus(true);
        })
        .catch(handleErr)

        function handleErr(err){
            console.log('Error:');
            console.log(err);

            var str = (typeof err === 'string') ? err : 'An error occurred';
            self.setState({loading: false})
            return Toast.error(str);
        }
    }

    handleFileChange(evt){
        console.log('handleFileChange:', evt.target.files);
    }

    getFormData(which){
        var data = {};
        _.each(this.forms[which], (ele, key)=>{
            data[key] = (ele && ele.state) ? ele.state.value : ele;
        });
        return data;
    }

    getCustomForm(data){
        data = data || {};

        var fields = {
            host        : null,
            port        : null,
            username    : null,
            password    : null,
        }

        this.forms.ssh.identityFile = data.identityFile;

        _.each(data, (val, key) => {
            fields[key] = val;
        });

        var authField = null;
        if(this.state.authType === 'password'){
            authField = <StartField width={8} type="password" fluid label='Password' placeholder='Password' ref={(r)=>{
                this.forms.ssh.password = r;
                if(Object.keys(data).length) this.focusable = r;
            }} />
        }
        else {
            if(data.isKeySet){
                var keyInput = (
                    <div>
                        <span>{data.identityFile}</span>
                        <br />
                        <label htmlFor="upload" className="key_link">Change</label>
                    </div>
                )
            }
            else {
                var keyInput = <label htmlFor="upload" className="key_link">Select a file</label>
            }

            authField = (
                <UI.Form.Field width={8}>
                    <label htmlFor="upload">Private Key:</label>
                    {keyInput}
                    <input hidden id="upload" type="file" onChange={this.handleFileChange.bind(this)} />
                </UI.Form.Field>
            )
        }

        return (
            <div>
                <UI.Divider clearing />
                <UI.Form.Group>
                    <StartField disabled={!!fields.host}  default={fields.host} label='Host' placeholder='Host' width={11} ref={(r)=>{this.forms.ssh.host = r}} />
                    <StartField disabled={!!fields.port} default={fields.port} label='Port' placeholder='Port' width={5} ref={(r)=>{this.forms.ssh.port = r}} />
                </UI.Form.Group>
                <UI.Divider clearing />
                <UI.Form.Group inline>
                    <label>Auth Type:</label>
                    <UI.Form.Radio
                        label='Password'
                        value='password'
                        checked={this.state.authType === 'password'}
                        onChange={this.handleAuthChange.bind(this)}
                        />
                    <UI.Form.Radio
                        label='Private Key'
                        value='key'
                        checked={this.state.authType === 'key'}
                        onChange={this.handleAuthChange.bind(this)}
                        />
                </UI.Form.Group>
                <UI.Divider clearing />
                <UI.Form.Group widths={"equal"}>
                    <StartField width={8} disabled={!!fields.username} default={fields.username} fluid label='Username' placeholder='Username' ref={(r)=>{this.forms.ssh.username = r}} />
                    {authField}
                </UI.Form.Group>
                <UI.Divider clearing />
                <UI.Button type='submit' content="Continue" onClick={this.checkTunnel.bind(this)} />
            </div>
        )
    }

    getPanel1(){
        var hostOptions = [{
            text : '(New Host)',
            value : this.customServerKey,
        }];

        var servers = this.props.servers || [];
        servers.forEach((s)=>{
            hostOptions.push({text: s.title, value: s.title})
        })

        var bottom = null;
        var activeHostData = _.find(servers, {title: this.state.hostKey});

        if(this.state.hostKey)
            bottom = this.getCustomForm(activeHostData);

        return (
            <UI.Container key="panel-1">
                <UI.Header as='h2'>
                    <UI.Label circular content="1" color="blue" horizontal style={{marginLeft: 0}} />
                    <span>Remote Server Setup</span>
                    <UI.Header.Subheader>Set up your remote server connection</UI.Header.Subheader>
                </UI.Header>
                <UI.Segment id="start_view_inner" loading={this.state.loading}>
                    <UI.Form>
                        <UI.Form.Select width={8} label='Host Selection:' placeholder='Hosts' options={hostOptions} onChange={this.handleHostChange.bind(this)} />
                        {bottom}
                    </UI.Form>
                </UI.Segment>
            </UI.Container>
        );
    }

    getPanel2(){
        var appData = this.props.app;

        // get and set defaults

        var current = appData.currentRoutes;
        var defaultRemotePort = _.get(current, 'tunnel.remotePort');
        var defaultRoute = _.get(current, 'proxy.routes[0].destination');

        console.log("Panel 2", defaultRoute,  defaultRemotePort);

        return (
            <UI.Container key="panel-2">
                <UI.Header as='h2'>
                    <UI.Label circular content="2" color="blue" horizontal style={{marginLeft: 0}} />
                    <span>Port Handling</span>
                    <UI.Header.Subheader>Set up your local and remote ports</UI.Header.Subheader>
                </UI.Header>
                <UI.Segment id="start_view_inner" loading={this.state.loading}>
                    <UI.Form>
                        <UI.Form.Group>
                            <StartField required type="number" label="Remote Port" placeholder="Port Number" width={4} default={defaultRemotePort} ref={(r)=>{this.forms.proxy.remotePort = this.focusable = r}} />
                        </UI.Form.Group>
                        <UI.Segment>
                            <UI.Form.Group>
                                <StartField type="input" label="App Destination" placeholder="http://localhost:3000" width={6} default={defaultRoute} ref={(r)=>{this.forms.proxy.app = r}} />
                                <StartField type="input" label="URL Match" placeholder="example.com" width={6} ref={(r)=>{this.forms.proxy.urlMatch = r}} />
                            </UI.Form.Group>
                        </UI.Segment>
                        <UI.Button content="Back" onClick={this.unsetRemote.bind(this)} />
                        <UI.Button color="blue" type='submit' content="Start" onClick={this.setRoutes.bind(this)} />
                    </UI.Form>
                </UI.Segment>
            </UI.Container>
        );
    }

    getPanel3(){
        var appData = this.props.app;
        return (
            <UI.Container key="panel-3">
                <UI.Segment id="start_view_inner" loading={this.state.loading}>
                    <UI.Header as='h2' dividing>
                        Reconnect
                        <UI.Header.Subheader>Click the button below to start the tunnel</UI.Header.Subheader>
                    </UI.Header>
                    <Shared.CurrentSetup remote={appData.currentRemote} routes={appData.currentRoutes} button={"Change"} onBack={this.setPanel.bind(this, 2, {force2: true})} />
                    <UI.Divider />
                    <UI.Button content="Connect" color="blue" onClick={this.connect.bind(this)} />
                </UI.Segment>
            </UI.Container>
        )
    }

    render(){
        var panel = null;

        switch(this.state.panel){
            case 1:
                panel = this.getPanel1();
                break;
            case 2:
                panel = this.getPanel2();
                break;
            case 3:
                panel = this.getPanel3();
                break;
        }

        // <UI.Message warning visible={true} header="SSH Setup" content="Provide your ssh details below:" />
        // <Shared.Steps />
        return (
            <div id="start_view">
                {panel}
            </div>
        );
    }
}

class StartField extends React.Component {
    constructor(props){
        super(props);
        this.state = {value: props.default || ""};
    }

    handleChange(evt, data){
        this.setState({value: data.value});
    }

    focus(){
        this.input.focus();
    }

    static getDerivedStateFromProps(nextProps, prevState){
        if(nextProps.value)
            return {value: nextProps.value};

        return null;
    }

    render(){
        return (
            <UI.Form.Field width={this.props.width} disabled={this.props.disabled} required={!!this.props.required}>
                <label>{this.props.label}:</label>
                <UI.Input type={this.props.type || 'input'} value={this.state.value} onChange={this.handleChange.bind(this)} autoFocus={this.props.autoFocus} ref={(input) => { this.input = input; }} placeholder={this.props.placeholder} />
            </UI.Form.Field>
        );
    }
}

module.exports = Start;
