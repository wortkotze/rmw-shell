import Activity from '../../containers/Activity'
import Avatar from '@material-ui/core/Avatar'
import Button from '@material-ui/core/Button'
import Dialog from '@material-ui/core/Dialog'
import DialogActions from '@material-ui/core/DialogActions'
import DialogContent from '@material-ui/core/DialogContent'
import DialogContentText from '@material-ui/core/DialogContentText'
import DialogTitle from '@material-ui/core/DialogTitle'
import FireForm from 'fireform'
import FormControl from '@material-ui/core/FormControl'
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormGroup from '@material-ui/core/FormGroup';
import FormHelperText from '@material-ui/core/FormHelperText'
import Icon from '@material-ui/core/Icon'
import IconButton from '@material-ui/core/IconButton'
import Input from '@material-ui/core/Input'
import InputAdornment from '@material-ui/core/InputAdornment'
import InputLabel from '@material-ui/core/InputLabel'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import Switch from '@material-ui/core/Switch';
import TextField from '@material-ui/core/TextField'
import Visibility from '@material-ui/icons/Visibility'
import VisibilityOff from '@material-ui/icons/VisibilityOff'
import classNames from 'classnames'
import requestNotificationPermission from '../../utils/messaging'
import withAppConfigs from '../../utils/withAppConfigs'
import { GoogleIcon, FacebookIcon, GitHubIcon, TwitterIcon } from '../../components/Icons'
import { ImageCropDialog } from '../../containers/ImageCropDialog'
import { change, submit, formValueSelector } from 'redux-form'
import { connect } from 'react-redux'
import { getList } from 'firekit'
import { injectIntl, intlShape } from 'react-intl'
import { setDialogIsOpen } from '../../store/dialogs/actions'
import { setPersistentValue } from '../../store/persistentValues/actions'
import { setSimpleValue } from '../../store/simpleValues/actions'
import { withFirebase } from 'firekit-provider'
import { withRouter } from 'react-router-dom'
import { withTheme, withStyles } from '@material-ui/core/styles'

const path = '/users/'
const form_name = 'my_account'

const styles = theme => ({
  avatar: {
    margin: 10,
  },
  bigAvatar: {
    width: 120,
    height: 120,
  },
  margin: {
    margin: theme.spacing.unit,
  },
  withoutLabel: {
    marginTop: theme.spacing.unit * 3,
  },
  textField: {
    //flexBasis: 200,
  },
})

export class MyAccount extends Component {

  state = {
    values: {
      displayName: '',
      email: '',
      photoURL: '',
      password: '',
      newPassword: '',
      confirmPassword: ''
    },
    errors: {},
    isPhotoDialogOpen: false
  }

  getProviderIcon = (p) => {
    const { theme } = this.props
    const color = 'primary'

    switch (p) {
      case 'google.com':
        return <GoogleIcon />

      case 'facebook.com':
        return <FacebookIcon />

      case 'twitter.com':
        return <TwitterIcon />

      case 'github.com':
        return <GitHubIcon />

      default:
        return undefined
    }
  }


  handleEmailVerificationsSend = () => {
    const { firebaseApp } = this.props;
    firebaseApp.auth().currentUser.sendEmailVerification().then(() => {
      alert('Verification E-Mail send');
    })
  }

  handlePhotoUploadSuccess = (snapshot) => {
    const { setSimpleValue } = this.props;

    snapshot.ref.getDownloadURL().then(downloadURL => {

      this.setState({ values: { ...this.state.values, photoURL: downloadURL } }, () => {


        this.setState({ isPhotoDialogOpen: false })
        //setSimpleValue('new_user_photo', undefined);
        //this.submit()
      })
    })

  }

  handleUserDeletion = () => {
    const { change, submit } = this.props;

    //submit(form_name)
  }

  handleValueChange = (name, value) => {

    return this.setState({ values: { ...this.state.values, [name]: value } }, () => { this.validate() })
  }

  getProvider = (firebase, provider) => {
    const { auth, firebaseApp, authError } = this.props;

    if (provider.indexOf('facebook') > -1) {
      return new firebase.auth.FacebookAuthProvider();
    }
    if (provider.indexOf('github') > -1) {
      return new firebase.auth.GithubAuthProvider();
    }
    if (provider.indexOf('google') > -1) {
      return new firebase.auth.GoogleAuthProvider();
    }
    if (provider.indexOf('twitter') > -1) {
      return new firebase.auth.TwitterAuthProvider();
    }
    if (provider.indexOf('phone') > -1) {
      return new firebase.auth.PhoneAuthProvider();
    }

    throw new Error('Provider is not supported!');
  };

  reauthenticateUser = (values, onSuccess) => {
    const { auth, firebaseApp, authError } = this.props;

    import('firebase').then(firebase => {
      if (this.isLinkedWithProvider('password') && !values) {
        if (onSuccess && onSuccess instanceof Function) {
          onSuccess();
        }
      } else if (this.isLinkedWithProvider('password') && values) {
        const credential = firebase.auth.EmailAuthProvider.credential(
          auth.email,
          values.password
        )
        firebaseApp.auth().currentUser.reauthenticateWithCredential(credential)
          .then(() => {
            if (onSuccess && onSuccess instanceof Function) {
              onSuccess();
            }
          }, e => { authError(e) })
      } else {
        firebaseApp.auth().currentUser.reauthenticateWithPopup(this.getProvider(firebase, auth.providerData[0].providerId)).then(() => {
          if (onSuccess && onSuccess instanceof Function) {
            onSuccess()
          }
        }, e => { authError(e) })
      }
    })


  }

  isLinkedWithProvider = (provider) => {
    const { auth } = this.props;


    try {
      return auth && auth.providerData && auth.providerData.find((p) => { return p.providerId === provider }) !== undefined;
    } catch (e) {
      return false;
    }
  }

  linkUserWithPopup = (p) => {
    const { firebaseApp, authError, authStateChanged } = this.props;


    import('firebase').then(firebase => {
      const provider = this.getProvider(firebase, p)

      firebaseApp.auth().currentUser.linkWithPopup(provider)
        .then((payload) => {
          authStateChanged(firebaseApp.auth().currentUser);
        }, e => { authError(e) })
    })


  }


  handleCreateValues = (values) => {
    return false;
  }

  clean = (obj) => {
    Object.keys(obj).forEach((key) => (obj[key] === undefined) && delete obj[key]);
    return obj
  }


  submit = () => {
    const { auth, firebaseApp, authStateChanged, authError, setSimpleValue } = this.props;

    const values = this.state.values

    const simpleChange = (values.displayName && values.displayName.localeCompare(auth.displayName)) ||
      (values.photoURL && values.photoURL.localeCompare(auth.photoURL));

    let simpleValues = {
      displayName: values.displayName,
      photoURL: values.photoURL
    }


    //Change simple data
    if (simpleChange) {
      firebaseApp.auth().currentUser.updateProfile(simpleValues).then(() => {

        firebaseApp.database().ref(`users/${auth.uid}`).update(this.clean(simpleValues)).then(() => {
          authStateChanged(values);
        }, e => { authError(e) });
      }, e => { authError(e) });
    }

    //Change email
    if (values.email && values.email.localeCompare(auth.email)) {

      this.reauthenticateUser(values, () => {
        firebaseApp.auth().currentUser.updateEmail(values.email).then(() => {
          firebaseApp.database().ref(`users/${auth.uid}`).update({ email: values.email }).then(() => {
            authStateChanged({ email: values.email });
          }, e => { authError(e) });
        }, e => {
          authError(e)

          if (e.code === 'auth/requires-recent-login') {
            firebaseApp.auth().signOut().then(function () {
              setTimeout(() => {
                alert('Please sign in again to change your email.');
              }, 1);
            });
          }

        });
      })
    }

    //Change password
    if (values.newPassword) {

      this.reauthenticateUser(values, () => {
        firebaseApp.auth().currentUser.updatePassword(values.newPassword).then(() => {
          firebaseApp.auth().signOut();
        }, e => {
          authError(e)

          if (e.code === 'auth/requires-recent-login') {
            firebaseApp.auth().signOut().then(() => {
              setTimeout(() => {
                alert('Please sign in again to change your password.');
              }, 1);
            });
          }
        });
      })
    }

    //setSimpleValue('new_user_photo', undefined);

    // We manage the data saving above
    return false;
  }

  handleClose = () => {
    const { setSimpleValue, setDialogIsOpen } = this.props;
    setSimpleValue('delete_user', false);
    setDialogIsOpen('auth_menu', false);
  }

  handleNotificationsClose = () => {
    const { setSimpleValue } = this.props;
    setSimpleValue('disable_notifications', false);
  }

  handleDelete = () => {
    const { firebaseApp, authError } = this.props;

    this.reauthenticateUser(false, () => {
      firebaseApp.auth().currentUser.delete()
        .then(() => {
          this.handleClose();
        }, e => {
          authError(e)

          if (e.code === 'auth/requires-recent-login') {
            firebaseApp.auth().signOut().then(() => {
              setTimeout(() => {
                alert('Please sign in again to delete your account.');
              }, 1);
            });
          }
        });
    });
  }


  validate = () => {
    const { auth } = this.props;
    const providerId = auth.providerData[0].providerId;
    const errors = {}
    const values = this.state.values

    if (!values.displayName) {
      errors.displayName = 'Required'
    }

    if (!values.email) {
      errors.email = 'Required'
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(values.email)) {
      errors.email = 'Invalid email address'
    } else if (!values.password && providerId === 'password' && auth.email.localeCompare(values.email)) {
      errors.password = 'For email change enter your password'
    }

    if (values.newPassword) {
      if (values.newPassword.length < 6) {
        errors.newPassword = 'Password should be at least 6 characters'
      } else if (values.newPassword.localeCompare(values.confirmPassword)) {
        errors.newPassword = 'Must be equal'
        errors.confirmPassword = 'Must be equal'
      }

      if (!values.password) {
        errors.password = 'Required'
      }

    }

    this.setState({ errors })

  }

  canSave = () => {

    const { auth } = this.props
    const values = this.state.values

    if (Object.keys(this.state.errors).length) {
      return false
    }

    if (values.displayName !== auth.displayName || values.email !== auth.email || values.photoURL !== auth.photoURL) {
      return true
    }

    if (values.newPassword) {
      return true
    }

    return false

  }

  componentWillMount() {
    const { watchList, auth } = this.props
    watchList(`notification_tokens/${auth.uid}`)
  }

  componentDidMount() {
    const { auth } = this.props
    const { displayName, email, photoURL } = auth

    this.setState({ values: { ...this.state.values, displayName, email, photoURL } })
  }

  handleDisableNotifications = () => {
    const { firebaseApp, auth, setSimpleValue, clearMessaging } = this.props

    firebaseApp.database().ref(`disable_notifications/${auth.uid}`).set(true).then(() => {
      firebaseApp.database().ref(`notification_tokens/${auth.uid}`).remove().then(() => {
        setSimpleValue('disable_notifications', false);
      })
    })
  }

  handleEnableNotificationsChange = (e) => {
    const { firebaseApp, auth, setSimpleValue } = this.props

    if (!e.target.checked) {
      setSimpleValue('disable_notifications', true);
    } else {
      firebaseApp.database().ref(`disable_notifications/${auth.uid}`).remove(() => {
        requestNotificationPermission(this.props)
        window.location.href = window.location.href
      })

    }
  }

  render() {
    const {
      history,
      intl,
      setSimpleValue,
      delete_user,
      disable_notifications,
      auth,
      theme,
      submit,
      firebaseApp,
      setDialogIsOpen,
      appConfig,
      classes,
      new_user_photo,
      notificationTokens
    } = this.props;

    const showPasswords = this.isLinkedWithProvider('password')

    return (
      <Activity
        iconStyleRight={{ width: '50%' }}
        appBarContent={
          <div style={{ display: 'flex' }}>
            {auth.uid &&
              <IconButton
                color="inherit"
                disabled={!this.canSave()}
                aria-label="open drawer"
                onClick={() => { this.submit() }}
              >
                <Icon className="material-icons" >save</Icon>
              </IconButton>
            }

            {auth.uid &&
              <IconButton
                color="inherit"
                aria-label="open drawer"
                onClick={() => setSimpleValue('delete_user', true)}
              >
                <Icon className="material-icons" >delete</Icon>
              </IconButton>
            }
          </ div>
        }
        title={intl.formatMessage({ id: 'my_account' })}>


        {
          auth.uid &&
          <div style={{ margin: 15, display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {this.state.values.photoURL &&
                <Avatar
                  alt={auth.displayName}
                  src={this.state.values.photoURL}
                  className={classNames(classes.avatar, classes.bigAvatar)}
                />
              }
              {!this.state.values.photoURL &&
                <Avatar className={classNames(classes.avatar, classes.bigAvatar)}> <Icon style={{ fontSize: 60 }}> person </Icon>  </Avatar>
              }

              <IconButton color="primary" onClick={() => { this.setState({ isPhotoDialogOpen: true }) }}>
                <Icon>photo_camera</Icon>
              </IconButton>


              <div>
                {
                  appConfig.firebase_providers.map((p, i) => {
                    if (p !== 'email' && p !== 'password' && p !== 'phone') {
                      return <IconButton
                        key={i}
                        disabled={this.isLinkedWithProvider(p)}
                        color='primary'
                        onClick={() => { this.linkUserWithPopup(p) }}
                      >
                        {this.getProviderIcon(p)}
                      </IconButton>
                    } else {
                      return <div key={i} />
                    }
                  })
                }
              </div>

              <div>
                <FormGroup row>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notificationTokens.length > 0}
                        onChange={this.handleEnableNotificationsChange}
                        value="checkedA"
                      />
                    }
                    label={intl.formatMessage({ id: 'notifications' })}
                  />
                </FormGroup>
              </div>
            </div>

            <div style={{ margin: 15, display: 'flex', flexDirection: 'column' }}>

              <FormControl className={classNames(classes.margin, classes.textField)} error={!!this.state.errors.displayName}>
                <InputLabel htmlFor="adornment-password">{intl.formatMessage({ id: 'name_label' })}</InputLabel>
                <Input
                  id="displayName"
                  fullWidth
                  value={this.state.values.displayName}
                  placeholder={intl.formatMessage({ id: 'name_hint' })}
                  onChange={(e) => { this.handleValueChange('displayName', e.target.value) }}
                />
                {this.state.errors.displayName &&
                  <FormHelperText id="name-helper-text">{this.state.errors.displayName}</FormHelperText>
                }
              </FormControl>
              <FormControl className={classNames(classes.margin, classes.textField)} error={!!this.state.errors.email}>
                <InputLabel htmlFor="adornment-password">{intl.formatMessage({ id: 'email' })}</InputLabel>
                <Input
                  //id="email"
                  label="Email"
                  autoComplete="off"
                  placeholder={intl.formatMessage({ id: 'email' })}
                  fullWidth
                  onChange={(e) => { this.handleValueChange('email', e.target.value) }}
                  value={this.state.values.email}
                  endAdornment={
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="Toggle password visibility"
                        onClick={auth.emailVerified === true ? undefined : this.handleEmailVerificationsSend}
                      //onMouseDown={this.handleMouseDownPassword}
                      >
                        {auth.emailVerified && <Icon color='primary'>verified_user</Icon>}
                        {!auth.emailVerified && <Icon color='secondary'>error</Icon>}

                      </IconButton>
                    </InputAdornment>
                  }
                />
                {this.state.errors.email &&
                  <FormHelperText id="name-helper-text">{this.state.errors.email}</FormHelperText>
                }
              </FormControl>

              {showPasswords &&
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <FormControl className={classNames(classes.margin, classes.textField)} error={!!this.state.errors.password}>
                    <InputLabel htmlFor="adornment-password">Password</InputLabel>
                    <Input
                      autoComplete="off"
                      type={this.state.showPassword ? 'text' : 'password'}
                      value={this.state.values.password}
                      onChange={(e) => { this.handleValueChange('password', e.target.value) }}
                      endAdornment={
                        <InputAdornment position="end">
                          <IconButton
                            color='primary'
                            aria-label="Toggle password visibility"
                            onClick={() => this.setState({ showPassword: !this.state.showPassword })}
                          >
                            {this.state.showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      }
                    />
                    {this.state.errors.password &&
                      <FormHelperText id="name-helper-text">{this.state.errors.password}</FormHelperText>
                    }
                  </FormControl>
                  <FormControl className={classNames(classes.margin, classes.textField)} error={!!this.state.errors.newPassword}>
                    <InputLabel htmlFor="adornment-password">{intl.formatMessage({ id: 'new_password' })}</InputLabel>
                    <Input
                      autoComplete="off"
                      type={this.state.showNewPassword ? 'text' : 'password'}
                      value={this.state.values.newPassword}
                      onChange={(e) => { this.handleValueChange('newPassword', e.target.value) }}
                      endAdornment={
                        <InputAdornment position="end">
                          <IconButton
                            color='primary'
                            aria-label="Toggle password visibility"
                            onClick={() => this.setState({ showNewPassword: !this.state.showNewPassword })}
                          >
                            {this.state.showNewPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      }
                    />
                    {this.state.errors.newPassword &&
                      <FormHelperText id="name-helper-text">{this.state.errors.newPassword}</FormHelperText>
                    }
                  </FormControl>
                  <FormControl className={classNames(classes.margin, classes.textField)} error={!!this.state.errors.confirmPassword}>
                    <InputLabel htmlFor="adornment-password">{intl.formatMessage({ id: 'confirm_password' })}</InputLabel>
                    <Input
                      autoComplete="off"
                      type={this.state.showConfirmPassword ? 'text' : 'password'}
                      value={this.state.values.confirmPassword}
                      onChange={(e) => { this.handleValueChange('confirmPassword', e.target.value) }}
                      endAdornment={
                        <InputAdornment position="end">
                          <IconButton
                            color='primary'
                            aria-label="Toggle password visibility"
                            onClick={() => this.setState({ showConfirmPassword: !this.state.showConfirmPassword })}
                          >
                            {this.state.showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      }
                    />
                    {this.state.errors.confirmPassword &&
                      <FormHelperText id="name-helper-text">{this.state.errors.confirmPassword}</FormHelperText>
                    }
                  </FormControl>
                </div>
              }
            </div>


          </div>
        }

        <Dialog
          open={delete_user === true}
          onClose={this.handleClose}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">{intl.formatMessage({ id: 'delete_account_dialog_title' })}</DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              {intl.formatMessage({ id: 'delete_account_dialog_message' })}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.handleClose} color="primary" >
              {intl.formatMessage({ id: 'cancel' })}
            </Button>
            <Button onClick={this.handleDelete} color="secondary" >
              {intl.formatMessage({ id: 'delete' })}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={disable_notifications === true}
          onClose={this.handleNotificationsClose}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">{intl.formatMessage({ id: 'disable_notifications_dialog_title' })}</DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              {intl.formatMessage({ id: 'disable_notifications_dialog_message' })}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.handleNotificationsClose} color="primary" >
              {intl.formatMessage({ id: 'cancel' })}
            </Button>
            <Button onClick={this.handleDisableNotifications} color="secondary" >
              {intl.formatMessage({ id: 'delete' })}
            </Button>
          </DialogActions>
        </Dialog>

        <ImageCropDialog
          path={`users/${auth.uid}`}
          fileName={`photoURL`}
          onUploadSuccess={(s) => { this.handlePhotoUploadSuccess(s) }}
          open={this.state.isPhotoDialogOpen}
          src={new_user_photo}
          handleClose={() => { this.setState({ isPhotoDialogOpen: false }) }}
          title={intl.formatMessage({ id: 'change_photo' })}
        />
      </Activity>
    );
  }
}

MyAccount.propTypes = {
  history: PropTypes.object,
  setSimpleValue: PropTypes.func.isRequired,
  intl: intlShape.isRequired,
  isGranted: PropTypes.func,
  auth: PropTypes.object.isRequired,
  vehicle_types: PropTypes.array,
};

const selector = formValueSelector(form_name)

const mapStateToProps = (state) => {
  const { intl, simpleValues, auth, messaging } = state

  const delete_user = simpleValues.delete_user
  const disable_notifications = simpleValues.disable_notifications
  const new_user_photo = simpleValues.new_user_photo

  return {
    new_user_photo,
    intl,
    delete_user,
    disable_notifications,
    auth,
    messaging,
    photoURL: selector(state, 'photoURL'),
    old_password: selector(state, 'old_password'),
    notificationTokens: getList(state, `notification_tokens/${auth.uid}`),
    simpleValues
  };
};


export default connect(
  mapStateToProps, { setSimpleValue, change, submit, setDialogIsOpen, setPersistentValue }
)(injectIntl(withRouter(withTheme()(withFirebase(withAppConfigs(withStyles(styles, { withTheme: true })(MyAccount)))))))
