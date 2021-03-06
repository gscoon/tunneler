'use babel';

const {remote, ipcRenderer} = require('electron');

const React     = require('react');
const {Component} = React;
const Reflux    = require('reflux');
const ReactDOM  = require('react-dom');
const swal      = require('sweetalert2');
const events    = require('events');

const { ToastContainer, toast } = require('react-toastify');

window.App      = new events.EventEmitter();

Object.assign(window, {
    Handler     : remote.getGlobal("Handler"),
    Main        : remote.getGlobal("Main"),
    Actions     : require('./actions/'),
    Util        : require('./../util.js'),
    UI          : require('semantic-ui-react'),
    moment      : require('moment'),
    Toast       : toast,
    I           : require('immutable'),
    _           : require('lodash'),
    Modal       : getModal(),
})

// attach to App
Object.assign(App, {
    apiHost         : Handler.api.getHost(),
    getEndpoint     : getEndpoint,
});

window.AppStore = require('./store/');

window.Shared = require('./components/shared/index.jsx');

var DashboardView = require('./components/dashboard/index.jsx');
var StartView = require('./components/start/index.jsx');

class AppView extends Reflux.Component {
    constructor(props){
        super(props);
        this.store = AppStore;
    }

    showLoader(){
        return (
            <UI.Dimmer active>
                <Loader content="Loading" />
            </UI.Dimmer>
        )
    }

    render(){
        var app = this.state.app.toJS();

        if(app.currentRoutes && this.state.tunnelStatus){
            var content = <DashboardView app={app} />
        }
        else {
            var servers = this.state.temp.get('servers').toJS();
            var content = <StartView app={app} servers={servers} />
        }

        return (
            <div id="outer">
                <Shared.Header />
                <div id="app_wrapper">
                    {content}
                    <ToastContainer position="bottom-center" autoClose={2000} />
                </div>
            </div>
        );
    }
}

ReactDOM.render(<AppView />, document.getElementById('app'))

function getModal(){
    return {
        close : ()=>{
            swal.close();
        },
        error : function(message){
            return swal({
                title   : "An error occorred",
                type    : 'error',
                text    : message,
                timer   : 2500
            })
        },
        showLoader: function(){
            return swal({
                showCancelButton: false,
                showConfirmButton: false,
                onOpen: () => {
                    swal.showLoading()
                }
            });
        },
        hideLoader: function(){
            return swal.close();
        },
        success : function(message){
            return swal({
                type    : "success",
                text    : message,
                timer   : 2500,
            })
        },
        confirm : function(message){
            return swal({
                type    : "warning",
                text    : message,
                showCancelButton: true,
                showConfirmButton: true,
                confirmButtonText : "Yes!",
            })
            .then(function(results){
                if(results && results.value)
                    return true;

                return Promise.reject(results);
            })
        },
        input   : function(data){
            return swal(Object.assign({
                input: "text",
                confirmButtonText: 'Save',
                showCancelButton: true,
                inputPlaceholder: "Type here",
            }, data))
            .then(function(results){
                if(!results || !results.value)
                    return Promise.reject();

                return results.value;
            })
        }
    }
}

function getEndpoint(url){
    return this.apiHost + url;
}
