$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $favoriteArticles = $("#favorited-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navSubmit = $('#nav-submit');
  const $userProfile = $('#user-profile');
  const $navFavorites = $('#nav-favorites');
  const $navMyStories = $('#nav-my-stories');
  const $myStories = $('#my-articles');
  
  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successful we will set up the user instance
   */

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
    await generateStories();
  });

  /**
   * Event listener for signing up.
   *  If successful we will set up a new user instance
   */

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function() {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function() {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  /**
   * Event handlers for submitting story
   */
  $navSubmit.on("click", function() {
    $submitForm.show();

  });

  $submitForm.on("submit", async function() {
    const storyListInstance = await StoryList.getStories();
    await storyListInstance.addStory(currentUser, {"author": $('#author').val(), "title": $('#title').val(), "url": $('#url').val()});
    await generateStories();
    hideElements();
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);
    let starClass = "fa-star-o";
    let storyMarkup = null;

    if (currentUser) {
      for (let i of currentUser.favorites) {
        starClass = i.storyId === story.storyId ? "fa-star" : starClass;
      }
    // Generate Markup for Logged-In User
    // render story markup
    storyMarkup = $(`
    <li id="${story.storyId}">
    <i class="fa ${starClass}" aria-hidden="true"></i>  
    <a class="article-link" href="${story.url}" target="a_blank">
        <strong>${story.title}</strong>
      </a>
      <small class="article-author">by ${story.author}</small>
      <small class="article-hostname ${hostName}">(${hostName})</small>
      <small class="article-username">posted by ${story.username}</small>
    </li>
    `);
    return storyMarkup;

    } else {
    // Non-logged-in story markup
    storyMarkup = $(`
    <li id="${story.storyId}"> 
    <a class="article-link" href="${story.url}" target="a_blank">
        <strong>${story.title}</strong>
      </a>
      <small class="article-author">by ${story.author}</small>
      <small class="article-hostname ${hostName}">(${hostName})</small>
      <small class="article-username">posted by ${story.username}</small>
    </li>
    `);
    return storyMarkup;
    }
  }

  /*****************************************
   * Favorites
   *****************************************/

  // Add stars to HTML

  function addStars() {
    let starClass = "fa-star-o";
    for (let li of $('li')) {
      for (let fav of currentUser.favorites) {
        if (fav.storyId === li.attr("id")) {
          starClass = "fa-star";
        }
      console.log(starClass);
      }
    }
  }
  
  
   // Check If Favorite
  //
  function isFavorite(tgt) {
    return tgt.hasClass("fa-star") ?  true :  false;
  }

  // Event handler for clicks on stars to add/remove favorite
  //
  $('body').on("click", "i.fa", async function(evt) {
    let $tgt = $(evt.target);
    let storyId = String($tgt.parent().attr("id"));
    if (isFavorite($tgt)) {
      await currentUser.deleteFavorite(storyId);
    } else {
      await currentUser.addFavorite(storyId);
    }
    $tgt.toggleClass("fa-star-o").toggleClass("fa-star");
    
    // Update currentUser to reflect favorites
    const token = currentUser.loginToken;
    const username = currentUser.username;
    currentUser = await User.getLoggedInUser(token, username);

  });

  // View Favorites
  //
  $navFavorites.on("click", function() {
    $favoriteArticles.html("Favorites");
    for (let s of currentUser.favorites) {
        const result = generateStoryHTML(s);
            $favoriteArticles.append(result);
    }  
    $favoriteArticles.show();
    $allStoriesList.hide();
  })


  /***********************************************
   * "My Stories" functionality
   ***********************************************/

   $navMyStories.on("click", function() {
     $myStories.show();
     $allStoriesList.hide();
   })
   


  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      // $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $userProfile,
      $favoriteArticles
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $navSubmit.show();
    $navFavorites.show();
    $navMyStories.show();
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
