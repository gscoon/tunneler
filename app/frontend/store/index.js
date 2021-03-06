import Reflux from 'reflux';

class AppStore extends Reflux.Store
{
    constructor(){
        super();

        var appData = Handler.data.get('app');
        appData.requests = _.orderBy(appData.requests, ['unixTimestamp'], ['desc']);

        var tunnel = Handler.api.getTunnel();

        var defaultApp = I.fromJS({
            requests        : [],
            currentRemote   : null,
            currentRoutes   : null,
        });

        this.state = {
            hasLoaded       : false,
            latestReq       : null,
            tunnelStatus    : tunnel.status,
            temp            : I.fromJS({
                servers        : []
            }),
            app             : defaultApp.mergeDeep(appData),
        }; // <- set store's default state much like in React

        this.listenables = [
            Actions.dashboard,
            Actions.start,
            Actions.settings,
        ];
    }

    onSetCurrentRemote(data){
        // default to resetting currentRoutes also
        var newApp = this.state.app.merge({
            currentRemote   : data,
            currentRoutes   : null,
        });

        this.setState({app: newApp});
        this.persist();
    }

    onSetTunnelStatus(status){
        this.setState({tunnelStatus: true})
    }

    // {tunnel, proxy}
    onSetRoutes(data){
        var newApp = this.state.app.set('currentRoutes', data);
        this.setState({app: newApp});
        this.persist();
    }

    onGetServers(){
        Handler.api.getServers()
        .then((response)=>{
            var serverList = I.fromJS(response.servers);
            var newTemp = this.state.temp.set('servers', serverList);
            this.setState({temp: newTemp});
        })
    }

    onGetLatestRequest(){
        var latest = this.state.latestReq || this.parseLatestRequest();
        if(!latest) return;

        Handler.api.getLatestRequests({id: latest.id})
        .then((res)=>{
            Modal.hideLoader();
            if(!res.data.length)
                return;

            console.log("New data", res.data.length);
            var newList = I.fromJS(res.data);
            var newApp = this.state.app.updateIn(['requests'], (oldList)=>{
                return newList.concat(oldList);
            })

            this.setState({app: newApp});
            Toast.info("New requests", {
                position: Toast.POSITION.BOTTOM_RIGHT
            });
            this.parseLatestRequest();
        })
        // var latest = this.parseLatestRequest();
        // console.log('Getting latest request', latest);
    }

    onDisconnect(){
        console.log("Disconnecting...");
        Handler.api.stopTunnel();
        Handler.api.stopProxy();
        // var newApp = this.state.app.set('currentRoutes', null);
        this.setState({tunnelStatus: false});
        this.persist();
    }

    onGetRequests(){
        Modal.showLoader();
        Handler.api.getAllRequests()
        .then((res)=>{
            Modal.hideLoader();
            var requestList = I.fromJS(res.data);
            var newApp = this.state.app.set('requests', requestList);
            console.log('Setting requests');
            this.setState({app: newApp});
            this.parseLatestRequest();
        })
        .catch(()=>{
            Modal.hideLoader();
        })
    }

    onDeleteRequest(id){
        Modal.showLoader();
        var url = App.getEndpoint('/api/requests');
        Util.del(url, {requests: [id]})
        .then((res)=>{
            var newApp = this.state.app.updateIn(['requests'], (requests)=>{
                return requests.filter((item)=>{
                    return item.get('id') !== id;
                })
            });

            this.setState({app: newApp});

            Toast.info("Removed");
            Modal.hideLoader();
        })
        .catch(()=>{
            Toast.error("An error occurred.");
            Modal.hideLoader();
        })
    }

    parseLatestRequest(){
        var latest = null;

        var reqList = this.state.app.get('requests');
        reqList.forEach((r)=>{
            if(!latest)
                return latest = this.formatLatest(r);

            if(r.get('unixTimestamp') > latest.timestamp)
                return latest = this.formatLatest(r);
        })

        this.setState({latestReq: latest});
        return latest;
    }

    formatLatest(r){
        return {id: r.get('id'), timestamp: r.get('unixTimestamp')};
    }

    persist(forceBlast){
        if(this.disablePersist){
            debug.error(moment().format(), "Persist disabled");
            return;
        }

        var data = this.state.app.toJS();
        delete data.temp;
        console.log(moment().format(), "Persisting")
        Handler.data.set('app', data, !forceBlast);
    }
}

module.exports = AppStore;
